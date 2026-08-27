/**
 * Vuttik ad server.
 *
 * Direct advertisers buy campaigns that are served from our own inventory. When
 * no campaign matches a request the endpoint reports a fallback so the client
 * can render a network ad (AdSense on web, AdMob once the mobile app ships)
 * instead of leaving the slot empty.
 *
 * Billing integrity: `/serve` issues a short-lived signed token that the
 * impression and click endpoints require. Without it, anyone could POST to the
 * tracking endpoints in a loop and drain a competitor's budget.
 */
import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { get, run, all } from './db.js';
import {
  authenticateToken,
  optionalAuth,
  requireMegaGuardian,
  JWT_SECRET,
} from './middleware.js';

export const adsRouter = express.Router();

/** Slots the client may request. Anything else is rejected. */
export const PLACEMENTS = ['feed', 'sidebar', 'product_detail', 'search', 'interstitial'] as const;
type Placement = typeof PLACEMENTS[number];

/** Campaign lifecycle. Only `active` campaigns are eligible to serve. */
const CAMPAIGN_STATUSES = ['pending', 'active', 'paused', 'rejected', 'completed'];

/** Plans whose subscribers do not see ads, mirroring the `no_ads` plan feature. */
const NO_ADS_FEATURE = 'no_ads';

/** How long a serve token stays valid. Long enough to render, short enough to
 *  make replay impractical. */
const SERVE_TOKEN_TTL_MS = 10 * 60 * 1000;

// --- Schema ----------------------------------------------------------------

export async function initAdsSchema() {
  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_ad_campaigns (
      id TEXT PRIMARY KEY,
      advertiser_uid TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      budget_total REAL NOT NULL DEFAULT 0,
      budget_spent REAL NOT NULL DEFAULT 0,
      bid_cpm REAL NOT NULL DEFAULT 1,
      currency TEXT DEFAULT 'USD',
      starts_at TEXT,
      ends_at TEXT,
      target_countries TEXT,
      target_provinces TEXT,
      target_categories TEXT,
      review_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_ad_creatives (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      placement TEXT NOT NULL,
      headline TEXT NOT NULL,
      body TEXT,
      image_url TEXT,
      cta_label TEXT,
      destination_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS vuttik_ad_events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      creative_id TEXT NOT NULL,
      type TEXT NOT NULL,
      user_uid TEXT,
      placement TEXT,
      country TEXT,
      category_id TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Reporting always filters by campaign and type, and the serve path filters
  // campaigns by status; without these every ad request would scan the tables.
  await run('CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON vuttik_ad_events (campaign_id, type, created_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign ON vuttik_ad_creatives (campaign_id, placement, is_active)');
  await run('CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON vuttik_ad_campaigns (status, starts_at, ends_at)');
  await run('CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser ON vuttik_ad_campaigns (advertiser_uid)');

  console.log('Ads schema ready.');
}

// --- Helpers ---------------------------------------------------------------

const parseList = (raw: any): string[] => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
};

/**
 * Only http(s) destinations are accepted; `javascript:` and `data:` URLs in an
 * ad creative would be a stored-XSS vector against every user who sees the ad.
 */
export function isSafeDestination(url: unknown): boolean {
  if (typeof url !== 'string' || url.length > 2000) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** A campaign targets a request when its (possibly empty) filters all match. */
function matchesTargeting(campaign: any, ctx: { country?: string; province?: string; categoryId?: string }) {
  const countries = parseList(campaign.target_countries);
  if (countries.length && (!ctx.country || !countries.includes(ctx.country))) return false;

  const provinces = parseList(campaign.target_provinces);
  if (provinces.length && (!ctx.province || !provinces.includes(ctx.province))) return false;

  const categories = parseList(campaign.target_categories);
  if (categories.length && (!ctx.categoryId || !categories.includes(ctx.categoryId))) return false;

  return true;
}

/** Picks a creative with probability proportional to its campaign's bid. */
function weightedPick(candidates: any[]): any | null {
  if (!candidates.length) return null;
  const total = candidates.reduce((sum, c) => sum + Math.max(c.bid_cpm, 0.01), 0);
  let roll = Math.random() * total;
  for (const candidate of candidates) {
    roll -= Math.max(candidate.bid_cpm, 0.01);
    if (roll <= 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

/**
 * Signs the served creative so tracking calls can be tied back to a real serve.
 * Reuses the JWT secret rather than introducing another key to rotate.
 */
function signServe(creativeId: string, campaignId: string, issuedAt: number): string {
  return crypto
    .createHmac('sha256', JWT_SECRET())
    .update(`${creativeId}.${campaignId}.${issuedAt}`)
    .digest('hex');
}

function makeServeToken(creativeId: string, campaignId: string): string {
  const issuedAt = Date.now();
  return `${issuedAt}.${signServe(creativeId, campaignId, issuedAt)}`;
}

function verifyServeToken(token: unknown, creativeId: string, campaignId: string): boolean {
  if (typeof token !== 'string') return false;
  const [issuedAtRaw, signature] = token.split('.');
  const issuedAt = Number(issuedAtRaw);
  if (!issuedAt || !signature) return false;
  if (Date.now() - issuedAt > SERVE_TOKEN_TTL_MS) return false;

  const expected = signServe(creativeId, campaignId, issuedAt);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // Constant-time compare; timingSafeEqual throws on length mismatch.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when the viewer's subscription plan removes advertising. */
async function planHidesAds(planId?: string): Promise<boolean> {
  if (!planId) return false;
  const plan: any = await get('SELECT features FROM vuttik_subscription_plans WHERE id = ?', [planId]);
  if (!plan) return false;
  return parseList(plan.features).includes(NO_ADS_FEATURE);
}

/** Shape sent to the client. Internal columns never cross the boundary. */
function toPublicCreative(row: any) {
  return {
    creativeId: row.id,
    campaignId: row.campaign_id,
    placement: row.placement,
    headline: row.headline,
    body: row.body,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label || 'Ver más',
    destinationUrl: row.destination_url,
  };
}

// --- Serving ---------------------------------------------------------------

/**
 * Returns an ad for a slot, or a fallback instruction when our own inventory
 * has nothing to show.
 */
adsRouter.get('/serve', optionalAuth, async (req: any, res) => {
  const placement = String(req.query.placement || 'feed') as Placement;
  if (!PLACEMENTS.includes(placement)) {
    return res.status(400).json({ error: 'Placement inválido' });
  }

  const ctx = {
    country: req.query.country ? String(req.query.country) : undefined,
    province: req.query.province ? String(req.query.province) : undefined,
    categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
  };

  try {
    // Paid plans opt out of advertising entirely.
    if (req.user && await planHidesAds(req.user.planId)) {
      return res.json({ ad: null, fallback: null, reason: 'plan_sin_anuncios' });
    }

    const now = new Date().toISOString();
    const rows: any[] = await all(
      `SELECT cr.*, c.bid_cpm, c.target_countries, c.target_provinces, c.target_categories
         FROM vuttik_ad_creatives cr
         JOIN vuttik_ad_campaigns c ON c.id = cr.campaign_id
        WHERE cr.placement = ?
          AND cr.is_active = 1
          AND c.status = 'active'
          AND c.budget_spent < c.budget_total
          AND (c.starts_at IS NULL OR c.starts_at <= ?)
          AND (c.ends_at   IS NULL OR c.ends_at   >= ?)`,
      [placement, now, now]
    );

    const eligible = rows.filter(row => matchesTargeting(row, ctx));
    const chosen = weightedPick(eligible);

    if (!chosen) {
      // Nothing of our own to show: let the client fill the slot with the ad
      // network so the inventory is not wasted.
      return res.json({
        ad: null,
        fallback: adsenseConfig(placement),
        reason: 'sin_campanas',
      });
    }

    res.json({
      ad: toPublicCreative(chosen),
      token: makeServeToken(chosen.id, chosen.campaign_id),
      fallback: null,
    });
  } catch (error: any) {
    // A failure here must never blank the page around the slot.
    console.error('Ad serve error:', error);
    res.json({ ad: null, fallback: null, reason: 'error' });
  }
});

/** AdSense slot ids come from the environment so they differ per deployment. */
function adsenseConfig(placement: Placement) {
  const client = process.env.ADSENSE_CLIENT_ID;
  if (!client) return null;
  const slotEnvKey = `ADSENSE_SLOT_${placement.toUpperCase()}`;
  const slot = process.env[slotEnvKey];
  if (!slot) return null;
  return { network: 'adsense', client, slot };
}

// --- Tracking --------------------------------------------------------------

async function recordEvent(
  type: 'impression' | 'click',
  body: any,
  req: any
): Promise<{ status: number; payload: any }> {
  const { creativeId, campaignId, token } = body;
  if (!creativeId || !campaignId) {
    return { status: 400, payload: { error: 'Faltan datos' } };
  }
  if (!verifyServeToken(token, creativeId, campaignId)) {
    // Either forged or expired: refuse to bill the advertiser for it.
    return { status: 403, payload: { error: 'Token de anuncio inválido' } };
  }

  const campaign: any = await get(
    'SELECT id, bid_cpm, budget_total, budget_spent, status FROM vuttik_ad_campaigns WHERE id = ?',
    [campaignId]
  );
  if (!campaign) return { status: 404, payload: { error: 'Campaña no encontrada' } };

  await run(
    `INSERT INTO vuttik_ad_events (id, campaign_id, creative_id, type, user_uid, placement, country, category_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuidv4(), campaignId, creativeId, type,
      req.user?.uid || null,
      body.placement || null,
      body.country || null,
      body.categoryId || null,
      new Date().toISOString(),
    ]
  );

  if (type === 'impression') {
    // CPM pricing: one impression costs a thousandth of the bid.
    const cost = campaign.bid_cpm / 1000;
    const spent = campaign.budget_spent + cost;
    const exhausted = spent >= campaign.budget_total;
    await run(
      `UPDATE vuttik_ad_campaigns SET budget_spent = ?, status = ?, updated_at = ? WHERE id = ?`,
      [spent, exhausted ? 'completed' : campaign.status, new Date().toISOString(), campaignId]
    );
  }

  return { status: 200, payload: { success: true } };
}

adsRouter.post('/impression', optionalAuth, async (req: any, res) => {
  try {
    const { status, payload } = await recordEvent('impression', req.body, req);
    res.status(status).json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.post('/click', optionalAuth, async (req: any, res) => {
  try {
    const { status, payload } = await recordEvent('click', req.body, req);
    res.status(status).json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Advertiser self-service ----------------------------------------------

/** Campaigns belonging to the signed-in advertiser, with their performance. */
adsRouter.get('/campaigns', authenticateToken, async (req: any, res) => {
  try {
    const campaigns: any[] = await all(
      'SELECT * FROM vuttik_ad_campaigns WHERE advertiser_uid = ? ORDER BY created_at DESC',
      [req.user.uid]
    );
    const enriched = await Promise.all(campaigns.map(async (c) => {
      const stats: any = await get(
        `SELECT
           SUM(CASE WHEN type = 'impression' THEN 1 ELSE 0 END) as impressions,
           SUM(CASE WHEN type = 'click'      THEN 1 ELSE 0 END) as clicks
         FROM vuttik_ad_events WHERE campaign_id = ?`,
        [c.id]
      );
      const impressions = stats?.impressions || 0;
      const clicks = stats?.clicks || 0;
      return {
        ...c,
        targetCountries: parseList(c.target_countries),
        targetProvinces: parseList(c.target_provinces),
        targetCategories: parseList(c.target_categories),
        impressions,
        clicks,
        ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
      };
    }));
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.post('/campaigns', authenticateToken, async (req: any, res) => {
  const { name, budgetTotal, bidCpm, startsAt, endsAt, targetCountries, targetProvinces, targetCategories, currency } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la campaña es obligatorio' });
  }
  const budget = Number(budgetTotal);
  if (!Number.isFinite(budget) || budget <= 0) {
    return res.status(400).json({ error: 'El presupuesto debe ser mayor que cero' });
  }
  const bid = Number(bidCpm);
  if (!Number.isFinite(bid) || bid <= 0) {
    return res.status(400).json({ error: 'La puja CPM debe ser mayor que cero' });
  }

  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO vuttik_ad_campaigns
         (id, advertiser_uid, name, status, budget_total, budget_spent, bid_cpm, currency,
          starts_at, ends_at, target_countries, target_provinces, target_categories, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.user.uid, name.trim(), budget, bid, currency || 'USD',
        startsAt || null, endsAt || null,
        JSON.stringify(parseList(targetCountries)),
        JSON.stringify(parseList(targetProvinces)),
        JSON.stringify(parseList(targetCategories)),
        now, now,
      ]
    );
    res.json({ id, status: 'pending' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Loads a campaign only if the caller owns it (or administers the platform). */
async function loadOwnedCampaign(req: any, campaignId: string) {
  const campaign: any = await get('SELECT * FROM vuttik_ad_campaigns WHERE id = ?', [campaignId]);
  if (!campaign) return { error: 404 };
  if (campaign.advertiser_uid !== req.user.uid && req.user.role !== 'mega_guardian') {
    return { error: 403 };
  }
  return { campaign };
}

adsRouter.patch('/campaigns/:id', authenticateToken, async (req: any, res) => {
  try {
    const { error } = await loadOwnedCampaign(req, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Campaña no encontrada' });
    if (error === 403) return res.status(403).json({ error: 'Acceso denegado' });

    // Advertisers may only pause or resume; approval is a moderator decision.
    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Solo puedes activar o pausar la campaña' });
    }
    const current: any = await get('SELECT status FROM vuttik_ad_campaigns WHERE id = ?', [req.params.id]);
    if (current.status === 'pending' || current.status === 'rejected') {
      return res.status(400).json({ error: 'La campaña aún no ha sido aprobada' });
    }

    await run('UPDATE vuttik_ad_campaigns SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.get('/campaigns/:id/creatives', authenticateToken, async (req: any, res) => {
  try {
    const { error } = await loadOwnedCampaign(req, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Campaña no encontrada' });
    if (error === 403) return res.status(403).json({ error: 'Acceso denegado' });

    const creatives = await all(
      'SELECT * FROM vuttik_ad_creatives WHERE campaign_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(creatives);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.post('/campaigns/:id/creatives', authenticateToken, async (req: any, res) => {
  const { placement, headline, body, imageUrl, ctaLabel, destinationUrl } = req.body;
  try {
    const { error } = await loadOwnedCampaign(req, req.params.id);
    if (error === 404) return res.status(404).json({ error: 'Campaña no encontrada' });
    if (error === 403) return res.status(403).json({ error: 'Acceso denegado' });

    if (!PLACEMENTS.includes(placement)) {
      return res.status(400).json({ error: 'Placement inválido' });
    }
    if (!headline || typeof headline !== 'string' || !headline.trim()) {
      return res.status(400).json({ error: 'El titular es obligatorio' });
    }
    if (!isSafeDestination(destinationUrl)) {
      return res.status(400).json({ error: 'La URL de destino debe ser http:// o https://' });
    }

    const id = uuidv4();
    await run(
      `INSERT INTO vuttik_ad_creatives
         (id, campaign_id, placement, headline, body, image_url, cta_label, destination_url, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, req.params.id, placement, headline.trim(), body || null, imageUrl || null,
       ctaLabel || null, destinationUrl, new Date().toISOString()]
    );
    res.json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.delete('/creatives/:id', authenticateToken, async (req: any, res) => {
  try {
    const creative: any = await get('SELECT campaign_id FROM vuttik_ad_creatives WHERE id = ?', [req.params.id]);
    if (!creative) return res.status(404).json({ error: 'Creatividad no encontrada' });

    const { error } = await loadOwnedCampaign(req, creative.campaign_id);
    if (error) return res.status(403).json({ error: 'Acceso denegado' });

    await run('DELETE FROM vuttik_ad_creatives WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Moderation ------------------------------------------------------------

adsRouter.get('/admin/campaigns', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    if (status && !CAMPAIGN_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const rows = status
      ? await all(
          `SELECT c.*, u.display_name as advertiser_name, u.email as advertiser_email
             FROM vuttik_ad_campaigns c
             LEFT JOIN vuttik_users u ON u.uid = c.advertiser_uid
            WHERE c.status = ? ORDER BY c.created_at DESC`, [status])
      : await all(
          `SELECT c.*, u.display_name as advertiser_name, u.email as advertiser_email
             FROM vuttik_ad_campaigns c
             LEFT JOIN vuttik_users u ON u.uid = c.advertiser_uid
            ORDER BY c.created_at DESC`);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adsRouter.post('/admin/campaigns/:id/review', authenticateToken, requireMegaGuardian, async (req: any, res) => {
  const { decision, note } = req.body;
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'Decisión inválida' });
  }
  try {
    const campaign: any = await get('SELECT id FROM vuttik_ad_campaigns WHERE id = ?', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });

    await run(
      'UPDATE vuttik_ad_campaigns SET status = ?, review_note = ?, updated_at = ? WHERE id = ?',
      [decision === 'approve' ? 'active' : 'rejected', note || null, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Platform-wide ad revenue and delivery summary. */
adsRouter.get('/admin/stats', authenticateToken, requireMegaGuardian, async (_req, res) => {
  try {
    const totals: any = await get(
      `SELECT
         COUNT(*) as campaigns,
         SUM(CASE WHEN status = 'active'  THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(budget_spent) as revenue
       FROM vuttik_ad_campaigns`
    );
    const events: any = await get(
      `SELECT
         SUM(CASE WHEN type = 'impression' THEN 1 ELSE 0 END) as impressions,
         SUM(CASE WHEN type = 'click'      THEN 1 ELSE 0 END) as clicks
       FROM vuttik_ad_events`
    );
    const impressions = events?.impressions || 0;
    const clicks = events?.clicks || 0;
    res.json({
      campaigns: totals?.campaigns || 0,
      active: totals?.active || 0,
      pending: totals?.pending || 0,
      revenue: +(totals?.revenue || 0).toFixed(2),
      impressions,
      clicks,
      ctr: impressions ? +(clicks / impressions * 100).toFixed(2) : 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

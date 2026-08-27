import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Play, Pause, Trash2, TrendingUp, Eye, MousePointerClick, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { AdPlacement } from './AdSlot';

/**
 * Self-service advertising panel.
 *
 * Advertisers create a campaign (budget + CPM bid + targeting), attach one or
 * more creatives, and watch delivery. Campaigns start as `pending` and only
 * begin serving once a moderator approves them.
 */

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget_total: number;
  budget_spent: number;
  bid_cpm: number;
  currency: string;
  review_note?: string | null;
  targetCountries: string[];
  targetCategories: string[];
  impressions: number;
  clicks: number;
  ctr: number;
}

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  feed: 'Feed social',
  sidebar: 'Barra lateral',
  product_detail: 'Ficha de producto',
  search: 'Resultados de búsqueda',
  interstitial: 'Intersticial',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  paused: 'bg-gray-200 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  pending: 'En revisión',
  paused: 'Pausada',
  rejected: 'Rechazada',
  completed: 'Presupuesto agotado',
};

export default function AdsManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCampaigns(await api.getAdCampaigns());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar las campañas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (campaign: Campaign) => {
    const next = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await api.setAdCampaignStatus(campaign.id, next);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totals = campaigns.reduce(
    (acc, c) => ({
      spent: acc.spent + c.budget_spent,
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
    }),
    { spent: 0, impressions: 0, clicks: 0 }
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-vuttik-blue/10 p-3">
            <Megaphone className="h-6 w-6 text-vuttik-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-vuttik-text">Publicidad</h1>
            <p className="text-sm text-vuttik-text-muted">Promociona tu negocio dentro de Vuttik</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-vuttik-blue px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Nueva campaña
        </button>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Invertido" value={`${totals.spent.toFixed(2)} USD`} />
        <StatCard icon={Eye} label="Impresiones" value={totals.impressions.toLocaleString()} />
        <StatCard
          icon={MousePointerClick}
          label="Clics"
          value={`${totals.clicks.toLocaleString()} (${totals.impressions ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00'}% CTR)`}
        />
      </section>

      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="py-12 text-center text-vuttik-text-muted">Cargando campañas…</p>
      ) : campaigns.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              expanded={expanded === campaign.id}
              onToggleExpand={() => setExpanded(expanded === campaign.id ? null : campaign.id)}
              onToggleStatus={() => toggleStatus(campaign)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-vuttik-gray bg-vuttik-gray/20 p-5">
      <div className="mb-2 flex items-center gap-2 text-vuttik-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-black text-vuttik-text">{value}</p>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-vuttik-gray py-16 text-center">
      <TrendingUp className="mx-auto mb-4 h-10 w-10 text-vuttik-text-muted" />
      <p className="mb-2 font-bold text-vuttik-text">Aún no tienes campañas</p>
      <p className="mx-auto mb-6 max-w-md text-sm text-vuttik-text-muted">
        Crea una campaña para mostrar tu negocio en el feed, la barra lateral o las fichas de producto.
        Pagas por cada mil impresiones (CPM).
      </p>
      <button onClick={onCreate} className="rounded-full bg-vuttik-blue px-6 py-3 text-sm font-bold text-white">
        Crear mi primera campaña
      </button>
    </div>
  );
}

function CampaignCard({
  campaign, expanded, onToggleExpand, onToggleStatus,
}: {
  campaign: Campaign;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleStatus: () => void;
}) {
  const progress = campaign.budget_total
    ? Math.min(100, (campaign.budget_spent / campaign.budget_total) * 100)
    : 0;
  const canToggle = campaign.status === 'active' || campaign.status === 'paused';

  return (
    <div className="rounded-3xl border border-vuttik-gray bg-vuttik-gray/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-vuttik-text">{campaign.name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLES[campaign.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[campaign.status] || campaign.status}
            </span>
          </div>
          <p className="text-sm text-vuttik-text-muted">
            {campaign.bid_cpm} {campaign.currency} CPM · {campaign.impressions.toLocaleString()} impresiones · {campaign.ctr}% CTR
          </p>
          {campaign.status === 'rejected' && campaign.review_note && (
            <p className="mt-2 text-sm text-red-600">Motivo: {campaign.review_note}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canToggle && (
            <button
              onClick={onToggleStatus}
              title={campaign.status === 'active' ? 'Pausar' : 'Reanudar'}
              className="rounded-full border border-vuttik-gray p-2.5 hover:bg-vuttik-gray/40"
            >
              {campaign.status === 'active'
                ? <Pause className="h-4 w-4 text-vuttik-text" />
                : <Play className="h-4 w-4 text-vuttik-text" />}
            </button>
          )}
          <button onClick={onToggleExpand} className="rounded-full border border-vuttik-gray px-4 py-2 text-xs font-bold text-vuttik-text hover:bg-vuttik-gray/40">
            {expanded ? 'Ocultar' : 'Anuncios'}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-vuttik-text-muted">
          <span>{campaign.budget_spent.toFixed(2)} gastado</span>
          <span>{campaign.budget_total.toFixed(2)} {campaign.currency}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-vuttik-gray/50">
          <div className="h-full rounded-full bg-vuttik-blue transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {expanded && <CreativeList campaignId={campaign.id} />}
    </div>
  );
}

function CreativeList({ campaignId }: { campaignId: string }) {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCreatives(await api.getAdCreatives(campaignId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    try {
      await api.deleteAdCreative(id);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mt-5 border-t border-vuttik-gray pt-5">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-vuttik-text-muted">Cargando anuncios…</p>
      ) : (
        <div className="space-y-2">
          {creatives.map((creative) => (
            <div key={creative.id} className="flex items-center gap-3 rounded-2xl bg-vuttik-gray/30 p-3">
              {creative.image_url && (
                <img src={creative.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-vuttik-text">{creative.headline}</p>
                <p className="text-xs text-vuttik-text-muted">
                  {PLACEMENT_LABELS[creative.placement as AdPlacement] || creative.placement}
                </p>
              </div>
              <button onClick={() => remove(creative.id)} className="rounded-full p-2 hover:bg-red-50" title="Eliminar">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ))}
          {creatives.length === 0 && (
            <p className="text-sm text-vuttik-text-muted">
              Esta campaña no tiene anuncios todavía, así que no se mostrará.
            </p>
          )}
        </div>
      )}

      {adding ? (
        <CreativeForm
          campaignId={campaignId}
          onDone={async () => { setAdding(false); await load(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 flex items-center gap-2 text-sm font-bold text-vuttik-blue hover:underline">
          <Plus className="h-4 w-4" /> Añadir anuncio
        </button>
      )}
    </div>
  );
}

function CreativeForm({ campaignId, onDone, onCancel }: { campaignId: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    placement: 'feed' as AdPlacement,
    headline: '',
    body: '',
    imageUrl: '',
    ctaLabel: '',
    destinationUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createAdCreative(campaignId, form);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-vuttik-gray p-4">
      <Field label="Ubicación">
        <select
          value={form.placement}
          onChange={(e) => setForm({ ...form, placement: e.target.value as AdPlacement })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm"
        >
          {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </Field>
      <Field label="Titular">
        <input required maxLength={80} value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
      </Field>
      <Field label="Descripción">
        <input maxLength={160} value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
      </Field>
      <Field label="URL de la imagen">
        <input type="url" value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
      </Field>
      <Field label="Texto del botón">
        <input maxLength={24} placeholder="Ver más" value={form.ctaLabel}
          onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
      </Field>
      <Field label="Enlace de destino">
        <input required type="url" placeholder="https://…" value={form.destinationUrl}
          onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
          className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="rounded-full bg-vuttik-blue px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar anuncio'}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-full border border-vuttik-gray px-5 py-2 text-sm font-bold text-vuttik-text">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function CreateCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', budgetTotal: '50', bidCpm: '2', startsAt: '', endsAt: '', targetCountries: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createAdCampaign({
        name: form.name,
        budgetTotal: Number(form.budgetTotal),
        bidCpm: Number(form.bidCpm),
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        targetCountries: form.targetCountries
          ? form.targetCountries.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
          : [],
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const estimatedImpressions = Number(form.bidCpm) > 0
    ? Math.floor((Number(form.budgetTotal) / Number(form.bidCpm)) * 1000)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white p-6 dark:bg-vuttik-dark"
      >
        <h2 className="text-xl font-black text-vuttik-text">Nueva campaña</h2>

        <Field label="Nombre de la campaña">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Presupuesto (USD)">
            <input required type="number" min="1" step="1" value={form.budgetTotal}
              onChange={(e) => setForm({ ...form, budgetTotal: e.target.value })}
              className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
          </Field>
          <Field label="Puja CPM (USD)">
            <input required type="number" min="0.5" step="0.5" value={form.bidCpm}
              onChange={(e) => setForm({ ...form, bidCpm: e.target.value })}
              className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
          </Field>
        </div>

        <p className="rounded-2xl bg-vuttik-blue/10 px-4 py-3 text-sm text-vuttik-text">
          Con este presupuesto obtendrás aproximadamente{' '}
          <strong>{estimatedImpressions.toLocaleString()}</strong> impresiones.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio (opcional)">
            <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
          </Field>
          <Field label="Fin (opcional)">
            <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
          </Field>
        </div>

        <Field label="Países (códigos ISO separados por coma, vacío = todos)">
          <input placeholder="DO, US, ES" value={form.targetCountries}
            onChange={(e) => setForm({ ...form, targetCountries: e.target.value })}
            className="w-full rounded-xl border border-vuttik-gray bg-transparent px-3 py-2 text-sm" />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-vuttik-text-muted">
          Tu campaña pasará por revisión antes de empezar a mostrarse.
        </p>

        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-full bg-vuttik-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? 'Creando…' : 'Crear campaña'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-full border border-vuttik-gray px-5 py-3 text-sm font-bold text-vuttik-text">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-vuttik-text-muted">{label}</span>
      {children}
    </label>
  );
}

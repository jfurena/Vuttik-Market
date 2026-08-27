import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

/**
 * Renders one advertising slot.
 *
 * Order of preference: a direct Vuttik campaign, then the ad network fallback
 * (AdSense today, AdMob once the mobile shell exists), then nothing at all.
 * The slot renders nothing rather than an empty box when there is no ad, so the
 * surrounding layout does not show a hole.
 */

export type AdPlacement = 'feed' | 'sidebar' | 'product_detail' | 'search' | 'interstitial';

interface ServedAd {
  creativeId: string;
  campaignId: string;
  placement: AdPlacement;
  headline: string;
  body?: string | null;
  imageUrl?: string | null;
  ctaLabel: string;
  destinationUrl: string;
}

interface AdResponse {
  ad: ServedAd | null;
  token?: string;
  fallback?: { network: string; client: string; slot: string } | null;
  reason?: string;
}

interface AdSlotProps {
  placement?: AdPlacement;
  /** Narrows targeting when the surrounding view knows the category. */
  categoryId?: string;
  className?: string;
}

export default function AdSlot({ placement = 'feed', categoryId, className = '' }: AdSlotProps) {
  const { user, hasFeature } = useAuth() as any;
  const [response, setResponse] = useState<AdResponse | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const impressionSent = useRef(false);

  const adFree = typeof hasFeature === 'function' && hasFeature('no_ads');

  useEffect(() => {
    if (adFree) return;
    let cancelled = false;

    api.serveAd({ placement, categoryId, country: user?.country })
      .then((data: AdResponse) => {
        if (!cancelled) setResponse(data);
      })
      .catch(() => {
        // An ad failing to load is never worth surfacing to the user.
        if (!cancelled) setResponse(null);
      });

    return () => { cancelled = true; };
  }, [placement, categoryId, user?.country, adFree]);

  // Only bill an impression once the slot has actually been on screen, which is
  // what advertisers are paying for.
  useEffect(() => {
    const node = containerRef.current;
    const ad = response?.ad;
    if (!node || !ad || !response?.token || impressionSent.current) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;
          api.trackAdEvent('impression', {
            creativeId: ad.creativeId,
            campaignId: ad.campaignId,
            token: response.token,
            placement,
            categoryId,
          }).catch(() => {});
          observer.disconnect();
        }
      }
    }, { threshold: 0.5 });

    observer.observe(node);
    return () => observer.disconnect();
  }, [response, placement, categoryId]);

  const handleClick = useCallback(() => {
    const ad = response?.ad;
    if (!ad || !response?.token) return;
    api.trackAdEvent('click', {
      creativeId: ad.creativeId,
      campaignId: ad.campaignId,
      token: response.token,
      placement,
      categoryId,
    }).catch(() => {});
  }, [response, placement, categoryId]);

  if (adFree) return null;
  if (!response) return null;

  if (response.ad) {
    return (
      <div ref={containerRef} className={`w-full my-6 ${className}`}>
        <AdLabel />
        <a
          href={response.ad.destinationUrl}
          target="_blank"
          // noopener/noreferrer: the destination is advertiser-controlled and
          // must not get a handle on our window.
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="group block rounded-3xl border border-vuttik-gray bg-vuttik-gray/20 p-4 transition-colors hover:border-vuttik-blue/50 hover:bg-vuttik-gray/40"
        >
          <div className="flex items-center gap-4">
            {response.ad.imageUrl && (
              <img
                src={response.ad.imageUrl}
                alt=""
                loading="lazy"
                className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-vuttik-text">{response.ad.headline}</p>
              {response.ad.body && (
                <p className="mt-1 line-clamp-2 text-sm text-vuttik-text-muted">{response.ad.body}</p>
              )}
            </div>
            <span className="flex-shrink-0 rounded-full bg-vuttik-blue px-4 py-2 text-xs font-bold text-white transition-transform group-hover:scale-105">
              {response.ad.ctaLabel}
            </span>
          </div>
        </a>
      </div>
    );
  }

  if (response.fallback?.network === 'adsense') {
    return (
      <div ref={containerRef} className={`w-full my-6 ${className}`}>
        <AdLabel />
        <AdSenseUnit client={response.fallback.client} slot={response.fallback.slot} />
      </div>
    );
  }

  // No inventory and no network configured: render nothing.
  return null;
}

function AdLabel() {
  return (
    <span className="mb-2 block w-full text-center text-[10px] font-black uppercase tracking-widest text-vuttik-text-muted">
      Publicidad
    </span>
  );
}

/** Tracks which AdSense units have already been handed to the SDK. */
let adsenseScriptPromise: Promise<void> | null = null;

function loadAdSenseScript(client: string): Promise<void> {
  if (adsenseScriptPromise) return adsenseScriptPromise;

  adsenseScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-vuttik-adsense]');
    if (existing) return resolve();

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.vuttikAdsense = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('AdSense no disponible'));
    document.head.appendChild(script);
  });

  return adsenseScriptPromise;
}

function AdSenseUnit({ client, slot }: { client: string; slot: string }) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    let cancelled = false;

    loadAdSenseScript(client)
      .then(() => {
        if (cancelled || pushed.current || !insRef.current) return;
        pushed.current = true;
        // The SDK reads configuration off the <ins> element we rendered.
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      })
      .catch(() => {
        // Blocked by an ad blocker or offline; leave the slot empty.
      });

    return () => { cancelled = true; };
  }, [client, slot]);

  return (
    <ins
      ref={insRef}
      className="adsbygoogle block"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

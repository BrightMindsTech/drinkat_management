'use client';

import { useState } from 'react';
import type { Branch } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

export function BranchGeofenceSection({ branches: initial }: { branches: Branch[] }) {
  const { t } = useLanguage();
  const [branches, setBranches] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  return (
    <section id="hr-branch-geofence" className="app-section scroll-mt-28">
      <h2 className="text-lg font-semibold text-app-primary mb-2">{t.hr.branchGeofenceTitle}</h2>
      <p className="text-sm text-app-secondary mb-4">{t.hr.branchGeofenceHelp}</p>
      <div className="space-y-6">
        {branches.map((b) => (
          <div key={b.id} className="rounded-xl border border-gray-200/90 dark:border-ios-dark-separator p-4 space-y-3">
            <div className="font-medium text-app-label">{b.name}</div>
            <label className="block text-sm">
              <span className="text-app-secondary">{t.hr.shiftProfileLabel}</span>
              <select
                className="app-select mt-1 w-full max-w-md"
                value={b.shiftProfile ?? 'default'}
                onChange={(e) => {
                  const v = e.target.value as 'default' | 'airport';
                  setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, shiftProfile: v } : x)));
                }}
              >
                <option value="default">{t.hr.shiftProfileDefault}</option>
                <option value="airport">{t.hr.shiftProfileAirport}</option>
              </select>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-sm">
                <span className="text-app-secondary">{t.hr.latitude}</span>
                <input
                  type="number"
                  step="any"
                  className="app-input mt-1 w-full"
                  value={b.latitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBranches((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, latitude: v === '' ? null : Number(v) } : x
                      )
                    );
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="text-app-secondary">{t.hr.longitude}</span>
                <input
                  type="number"
                  step="any"
                  className="app-input mt-1 w-full"
                  value={b.longitude ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBranches((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, longitude: v === '' ? null : Number(v) } : x
                      )
                    );
                  }}
                />
              </label>
              <label className="block text-sm">
                <span className="text-app-secondary">{t.hr.radiusM}</span>
                <input
                  type="number"
                  min={10}
                  max={500}
                  step={1}
                  className="app-input mt-1 w-full"
                  value={b.geofenceRadiusM ?? 25}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBranches((prev) =>
                      prev.map((x) =>
                        x.id === b.id ? { ...x, geofenceRadiusM: v === '' ? 25 : Number(v) } : x
                      )
                    );
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={saving === b.id || b.latitude == null || b.longitude == null}
              className="app-btn-primary text-sm"
              onClick={async () => {
                if (b.latitude == null || b.longitude == null) return;
                setSaving(b.id);
                try {
                  const r = await fetch(`/api/branches/${b.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      latitude: b.latitude,
                      longitude: b.longitude,
                      geofenceRadiusM: b.geofenceRadiusM ?? 25,
                      shiftProfile: b.shiftProfile ?? 'default',
                    }),
                  });
                  if (!r.ok) return;
                  const j = (await r.json()) as Branch;
                  setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...j } : x)));
                } finally {
                  setSaving(null);
                }
              }}
            >
              {saving === b.id ? '…' : t.hr.saveBranchGeofence}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

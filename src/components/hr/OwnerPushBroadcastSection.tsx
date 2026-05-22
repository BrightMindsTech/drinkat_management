'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { useSubmitLock } from '@/lib/use-async-action-lock';

type BroadcastStats = {
  userCount: number;
  pushUserCount: number;
  usersWithoutPushDevice: number;
  pushSubscriptionCount: number;
  cooldownRemainingMs: number;
};

type BroadcastResult = {
  recipientUsers: number;
  usersWithPushDevice: number;
  usersReachedByPush: number;
  usersWithoutPushDevice: number;
  pushSubscriptionsAttempted: number;
  pushSubscriptionsDelivered: number;
  pushSubscriptionsExpiredRemoved: number;
  duplicateSubscriptionsPruned: number;
};

export function OwnerPushBroadcastSection() {
  const { t } = useLanguage();
  const submitLock = useSubmitLock();
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [href, setHref] = useState('/dashboard');
  const [error, setError] = useState('');
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/push/broadcast', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as BroadcastStats;
      setStats(data);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const cooldownSec = stats ? Math.ceil(stats.cooldownRemainingMs / 1000) : 0;
  const onCooldown = cooldownSec > 0;

  function handleSend() {
    void submitLock.run(async () => {
      setError('');
      setResult(null);
      if (!title.trim() || !body.trim()) {
        setError(t.hr.pushBroadcastValidation);
        return;
      }
      if (
        !window.confirm(
          interpolate(t.hr.pushBroadcastConfirm, {
            total: String(stats?.userCount ?? '—'),
            withPush: String(stats?.pushUserCount ?? '—'),
            withoutPush: String(stats?.usersWithoutPushDevice ?? '—'),
          })
        )
      ) {
        return;
      }

      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          href: href.trim() || '/dashboard',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as BroadcastResult & {
        error?: string;
        cooldownRemainingMs?: number;
      };

      if (!res.ok) {
        if (res.status === 429 && typeof data.cooldownRemainingMs === 'number') {
          setStats((prev) =>
            prev ? { ...prev, cooldownRemainingMs: data.cooldownRemainingMs! } : prev
          );
        }
        setError(data.error ?? t.hr.pushBroadcastFailed);
        return;
      }

      setResult({
        recipientUsers: data.recipientUsers ?? 0,
        usersWithPushDevice: data.usersWithPushDevice ?? 0,
        usersReachedByPush: data.usersReachedByPush ?? 0,
        usersWithoutPushDevice: data.usersWithoutPushDevice ?? 0,
        pushSubscriptionsAttempted: data.pushSubscriptionsAttempted ?? data.pushDelivered ?? 0,
        pushSubscriptionsDelivered: data.pushSubscriptionsDelivered ?? data.pushDelivered ?? 0,
        pushSubscriptionsExpiredRemoved: data.pushSubscriptionsExpiredRemoved ?? 0,
        duplicateSubscriptionsPruned: data.duplicateSubscriptionsPruned ?? 0,
      });
      setTitle('');
      setBody('');
      void loadStats();
    });
  }

  const pushFailed =
    result != null
      ? Math.max(
          0,
          result.pushSubscriptionsAttempted -
            result.pushSubscriptionsDelivered -
            result.pushSubscriptionsExpiredRemoved
        )
      : 0;

  function handleCleanup() {
    void submitLock.run(async () => {
      setCleanupMessage('');
      setError('');
      const res = await fetch('/api/push/cleanup', { method: 'POST', credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as { removed?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? t.hr.pushBroadcastFailed);
        return;
      }
      setCleanupMessage(
        interpolate(t.hr.pushBroadcastCleanupDone, { count: String(data.removed ?? 0) })
      );
      void loadStats();
    });
  }

  return (
    <section id="hr-owner-push-broadcast" className="app-section scroll-mt-28">
      <h2 className="text-lg font-semibold text-app-primary mb-1">{t.hr.pushBroadcastTitle}</h2>
      <p className="text-sm text-app-secondary mb-4">{t.hr.pushBroadcastIntro}</p>
      {stats ? (
        <ul className="text-xs text-app-muted mb-4 space-y-1 list-disc ps-4">
          <li>
            {interpolate(t.hr.pushBroadcastStatTotal, { count: String(stats.userCount) })}
          </li>
          <li>
            {interpolate(t.hr.pushBroadcastStatCanPush, {
              users: String(stats.pushUserCount),
              devices: String(stats.pushSubscriptionCount),
            })}
          </li>
          {stats.usersWithoutPushDevice > 0 ? (
            <li>
              {interpolate(t.hr.pushBroadcastStatNoPush, {
                count: String(stats.usersWithoutPushDevice),
              })}
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="rounded-xl border border-gray-200/90 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 space-y-4 max-w-xl">
        <label className="block text-sm">
          <span className="text-app-label font-medium">{t.hr.pushBroadcastTitleLabel}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder={t.hr.pushBroadcastTitlePlaceholder}
            className="app-input mt-1 w-full"
            disabled={submitLock.busy}
          />
        </label>
        <label className="block text-sm">
          <span className="text-app-label font-medium">{t.hr.pushBroadcastBodyLabel}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={t.hr.pushBroadcastBodyPlaceholder}
            className="app-input mt-1 w-full resize-y min-h-[5rem]"
            disabled={submitLock.busy}
          />
        </label>
        <label className="block text-sm">
          <span className="text-app-label font-medium">{t.hr.pushBroadcastLinkLabel}</span>
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            maxLength={200}
            placeholder="/dashboard/time-clock"
            className="app-input mt-1 w-full font-mono text-sm"
            disabled={submitLock.busy}
          />
          <span className="text-xs text-app-muted mt-1 block">{t.hr.pushBroadcastLinkHint}</span>
        </label>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        {result ? (
          <div
            className="rounded-lg border border-green-200 bg-green-50/90 p-3 text-sm text-green-900 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-100 space-y-2"
            role="status"
          >
            <p className="font-semibold">{t.hr.pushBroadcastSuccessTitle}</p>
            <ul className="list-disc ps-4 space-y-1 text-green-800 dark:text-green-200">
              <li>
                {interpolate(t.hr.pushBroadcastSuccessPhone, {
                  reached: String(result.usersReachedByPush),
                  withPush: String(result.usersWithPushDevice),
                  deliveries: String(result.pushSubscriptionsDelivered),
                })}
              </li>
              {result.usersWithoutPushDevice > 0 ? (
                <li>
                  {interpolate(t.hr.pushBroadcastSuccessNoDevice, {
                    count: String(result.usersWithoutPushDevice),
                  })}
                </li>
              ) : null}
              {result.duplicateSubscriptionsPruned > 0 ? (
                <li>
                  {interpolate(t.hr.pushBroadcastSuccessPruned, {
                    count: String(result.duplicateSubscriptionsPruned),
                  })}
                </li>
              ) : null}
              {result.pushSubscriptionsExpiredRemoved > 0 ? (
                <li>
                  {interpolate(t.hr.pushBroadcastSuccessExpiredRemoved, {
                    count: String(result.pushSubscriptionsExpiredRemoved),
                  })}
                </li>
              ) : null}
              {pushFailed > 0 ? (
                <li>
                  {interpolate(t.hr.pushBroadcastSuccessFailed, { count: String(pushFailed) })}
                </li>
              ) : null}
            </ul>
            {result.pushSubscriptionsExpiredRemoved > 0 || pushFailed > 0 ? (
              <p className="text-xs text-green-800/90 dark:text-green-200/90 pt-1">
                {t.hr.pushBroadcastReconnectHint}
              </p>
            ) : null}
          </div>
        ) : null}
        {cleanupMessage ? (
          <p className="text-sm text-app-secondary">{cleanupMessage}</p>
        ) : null}
        {onCooldown ? (
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {interpolate(t.hr.pushBroadcastCooldown, { seconds: String(cooldownSec) })}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={submitLock.busy || onCooldown}
            className="app-btn-primary disabled:opacity-50"
          >
            {submitLock.busy ? t.hr.pushBroadcastSending : t.hr.pushBroadcastSend}
          </button>
          <button
            type="button"
            onClick={handleCleanup}
            disabled={submitLock.busy}
            className="app-btn-secondary disabled:opacity-50"
          >
            {t.hr.pushBroadcastCleanup}
          </button>
        </div>
      </div>
    </section>
  );
}

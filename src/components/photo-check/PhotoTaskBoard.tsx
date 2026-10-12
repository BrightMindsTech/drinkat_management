'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { formatAppDateTime } from '@/lib/format-datetime';
import {
  PHOTO_360_CODE,
  PHOTO_DEFAULT_MAX_PHOTOS,
  PHOTO_UPLOAD_MAX_BYTES,
  applyPhotoSlotChange,
} from '@/lib/photo-multi';
import { parseCriteriaJson } from '@/lib/photo-score';
import { formatPhotoCountdown, nextPhotoWave } from '@/lib/photo-upcoming';

type Task = {
  id: string;
  kind?: 'task' | 'upcoming';
  status: string;
  dueAt: string;
  windowStartAt?: string;
  slotKey: string;
  type: {
    code: string;
    titleEn: string;
    titleAr: string;
    requiresMeasurement: boolean;
    measurementUnit: string | null;
    handwrittenNote: string | null;
    criteriaJson?: string | null;
    minPhotos: number;
    maxPhotos: number;
  };
  schedule: { slotLabelEn: string; slotLabelAr: string };
  submission: { status: string; aiVerdict: string; aiScore: number | null } | null;
};

function isWindowClosed(row: Task, nowMs: number): boolean {
  if (row.status === 'completed' || row.status === 'excused') return false;
  if (!row.dueAt) return false;
  return new Date(row.dueAt).getTime() < nowMs;
}

function isLockedTask(row: Task, nowMs: number): boolean {
  if (row.kind === 'upcoming' || row.status === 'scheduled') return true;
  if (!row.windowStartAt) return false;
  return new Date(row.windowStartAt).getTime() > nowMs;
}

type Draft = { preview: string; file: File };

async function discardUploads(paths: string[], reason: 'cancelled_submit' | 'failed_submit') {
  if (!paths.length) return;
  await fetch('/api/upload/discard', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths, reason }),
  }).catch(() => undefined);
}

export function PhotoTaskBoard() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusTaskId = searchParams.get('task');
  const closedTaskRef = useRef<string | null>(null);
  const [required, setRequired] = useState<boolean | null>(null);
  const [items, setItems] = useState<Task[]>([]);
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [active, setActive] = useState<Task | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [measured, setMeasured] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const draftsRef = useRef<Draft[]>([]);
  const submittingRef = useRef(false);
  const submitGenRef = useRef(0);
  const replaceIndexRef = useRef<number | null>(null);
  const reloadedForOpenRef = useRef(0);
  draftsRef.current = drafts;

  const load = useCallback(async () => {
    const res = await fetch('/api/photo-checks/tasks', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json()) as { required?: boolean; items?: Task[]; upcoming?: Task[] };
    setRequired(Boolean(json.required));
    setItems(Array.isArray(json.items) ? json.items : []);
    setUpcoming(Array.isArray(json.upcoming) ? json.upcoming : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!focusTaskId) return;
    if (closedTaskRef.current === focusTaskId) return;
    if (required !== true) return;
    const hit = items.find((x) => x.id === focusTaskId);
    if (!hit && !upcoming.some((x) => x.id === focusTaskId)) {
      setError(t.photoCheck.windowGone);
      return;
    }
    setHighlightId(focusTaskId);
    const clear = window.setTimeout(() => setHighlightId(null), 3000);
    const willOpen = Boolean(hit && hit.status !== 'completed' && !isLockedTask(hit, Date.now()));
    requestAnimationFrame(() => {
      if (willOpen) return;
      document.getElementById(`photo-task-${focusTaskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (willOpen && hit) setActive(hit);
    return () => window.clearTimeout(clear);
  }, [focusTaskId, items, upcoming, required, t.photoCheck.windowGone]);

  useEffect(() => {
    if (!active) return;
    const id = `photo-task-active-${active.id}`;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    return () => {
      for (const d of draftsRef.current) URL.revokeObjectURL(d.preview);
    };
  }, []);

  const lockedWave = useMemo(
    () =>
      nextPhotoWave([
        ...items.filter((row) => !isWindowClosed(row, nowTick) && isLockedTask(row, nowTick)),
        ...upcoming,
      ]),
    [items, upcoming, nowTick]
  );

  const lockedIds = useMemo(() => new Set(lockedWave.map((row) => row.id)), [lockedWave]);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const item of items) {
      if (isWindowClosed(item, nowTick) || lockedIds.has(item.id) || isLockedTask(item, nowTick)) continue;
      const key = locale === 'ar' ? item.type.titleAr : item.type.titleEn;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items, locale, lockedIds, nowTick]);

  const nextOpenAt = lockedWave[0]?.windowStartAt ? new Date(lockedWave[0].windowStartAt).getTime() : 0;
  const remainingMs = nextOpenAt > 0 ? nextOpenAt - nowTick : 0;

  useEffect(() => {
    if (nextOpenAt <= 0) return;
    if (nowTick < nextOpenAt) {
      reloadedForOpenRef.current = 0;
      return;
    }
    if (reloadedForOpenRef.current === nextOpenAt) return;
    reloadedForOpenRef.current = nextOpenAt;
    void load();
  }, [nextOpenAt, nowTick, load]);

  function cancelInFlight() {
    submitGenRef.current += 1;
    submittingRef.current = false;
    setBusy(false);
    setProgress(null);
  }

  function openTask(task: Task) {
    if (isLockedTask(task, Date.now())) return;
    closedTaskRef.current = null;
    if (submittingRef.current) {
      cancelInFlight();
      setError(t.photoCheck.submitCancelled);
    }
    for (const d of drafts) URL.revokeObjectURL(d.preview);
    setDrafts([]);
    setMeasured('');
    setResult(null);
    setActive(task);
  }

  function closeTask() {
    if (active) closedTaskRef.current = active.id;
    if (submittingRef.current) {
      cancelInFlight();
      setError(t.photoCheck.submitCancelled);
    }
    for (const d of drafts) URL.revokeObjectURL(d.preview);
    setDrafts([]);
    setMeasured('');
    setProgress(null);
    setActive(null);
    if (focusTaskId) router.replace(pathname, { scroll: false });
  }

  function toDraft(file: File): Draft | null {
    if (file.type && !file.type.startsWith('image/')) return null;
    if (file.size > PHOTO_UPLOAD_MAX_BYTES) {
      setError(t.photoCheck.fileTooLarge);
      return null;
    }
    return { file, preview: URL.createObjectURL(file) };
  }

  function addFiles(files: FileList | null) {
    if (!active || submittingRef.current || !files?.length) return;
    const max = Math.min(PHOTO_DEFAULT_MAX_PHOTOS, Math.max(1, active.type.maxPhotos || PHOTO_DEFAULT_MAX_PHOTOS));
    const replaceAt = replaceIndexRef.current;
    replaceIndexRef.current = null;
    if (replaceAt != null && replaceAt >= 0 && replaceAt < drafts.length) {
      const chosen = files.item(0);
      if (!chosen) return;
      const next = toDraft(chosen);
      if (!next) return;
      setError(null);
      setDrafts((prev) => {
        const old = prev[replaceAt];
        const updated = applyPhotoSlotChange(prev, next, { mode: 'replace', index: replaceAt, max });
        if (old && updated[replaceAt] !== old) URL.revokeObjectURL(old.preview);
        return updated;
      });
    } else {
      const room = Math.max(0, max - drafts.length);
      const next: Draft[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const d = toDraft(file);
        if (d) next.push(d);
      }
      if (next.length) {
        setError(null);
        setDrafts((prev) => {
          let acc = prev;
          for (const d of next) acc = applyPhotoSlotChange(acc, d, { mode: 'add', max });
          return acc;
        });
      }
    }
    if (cameraRef.current) cameraRef.current.value = '';
  }

  function removeDraft(index: number) {
    if (submittingRef.current) return;
    setDrafts((prev) => {
      const removed = prev[index];
      const next = applyPhotoSlotChange(prev, null, { mode: 'remove', index, max: PHOTO_DEFAULT_MAX_PHOTOS });
      if (removed && next.length !== prev.length) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  async function submit() {
    if (!active || submittingRef.current) return;
    const min = Math.max(1, active.type.minPhotos || 1);
    const max = Math.min(PHOTO_DEFAULT_MAX_PHOTOS, Math.max(min, active.type.maxPhotos || PHOTO_DEFAULT_MAX_PHOTOS));
    if (drafts.length < min) {
      setError(t.photoCheck.needMorePhotos.replace('{min}', String(min)));
      return;
    }
    if (drafts.length > max) {
      setError(t.photoCheck.photoCount.replace('{count}', String(drafts.length)).replace('{max}', String(max)));
      return;
    }
    if (active.type.requiresMeasurement && !measured.trim()) {
      setError('Measured value required');
      return;
    }
    submittingRef.current = true;
    const gen = ++submitGenRef.current;
    const taskId = active.id;
    const files = drafts.map((d) => d.file);
    const measuredValue = measured || undefined;
    const uploadPaths: string[] = [];
    let committed = false;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      for (let i = 0; i < files.length; i += 1) {
        if (submitGenRef.current !== gen) throw new Error(t.photoCheck.submitCancelled);
        setProgress(
          t.photoCheck.uploadingPhotos.replace('{n}', String(i + 1)).replace('{total}', String(files.length))
        );
        const form = new FormData();
        form.set('file', files[i]);
        const up = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
        if (up.status === 401) throw new Error(t.photoCheck.uploadFailed);
        const upJson = (await up.json()) as { url?: string; error?: string };
        if (!up.ok || !upJson.url) throw new Error(upJson.error || t.photoCheck.uploadFailed);
        uploadPaths.push(upJson.url);
      }
      if (submitGenRef.current !== gen) throw new Error(t.photoCheck.submitCancelled);
      if (uploadPaths.length < min) throw new Error(t.photoCheck.needMorePhotos.replace('{min}', String(min)));
      setProgress(t.photoCheck.reviewing);
      const res = await fetch('/api/photo-checks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          uploadPath: uploadPaths[0],
          uploadPaths,
          measuredValue,
        }),
      });
      const json = (await res.json()) as { error?: string; employeeOutcome?: string; code?: string };
      if (res.ok) {
        committed = true;
        setResult(json.employeeOutcome ?? 'pending_qc');
        for (const d of draftsRef.current) URL.revokeObjectURL(d.preview);
        setDrafts([]);
        setActive(null);
        setMeasured('');
        await load();
        return;
      }
      if (json.code === 'BRANCH_CLAIMED' || res.status === 409) {
        await load();
        setActive(null);
      }
      if (submitGenRef.current !== gen) throw new Error(t.photoCheck.submitCancelled);
      throw new Error(
        json.code === 'BRANCH_CLAIMED' ? t.photoCheck.branchClaimed : json.error || t.photoCheck.reviewFailed
      );
    } catch (e) {
      const cancelled = submitGenRef.current !== gen || (e instanceof Error && e.message === t.photoCheck.submitCancelled);
      if (!committed) {
        await discardUploads(uploadPaths, cancelled ? 'cancelled_submit' : 'failed_submit');
      }
      setError(e instanceof Error ? e.message : t.photoCheck.reviewFailed);
    } finally {
      if (committed || submitGenRef.current === gen) {
        submittingRef.current = false;
        setBusy(false);
        setProgress(null);
      }
    }
  }

  if (required == null) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-app-primary">{t.photoCheck.todayTitle}</h2>
        <p className="text-sm text-app-muted">{t.photoCheck.loadingTasks}</p>
      </div>
    );
  }

  if (required !== true) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        <h2 className="text-xl font-bold text-app-primary">{t.photoCheck.notRequiredTitle}</h2>
        <p className="mt-2 text-sm text-app-muted">{t.photoCheck.notRequiredHint}</p>
      </div>
    );
  }

  const min = Math.max(1, active?.type.minPhotos || 1);
  const max = Math.min(
    PHOTO_DEFAULT_MAX_PHOTOS,
    Math.max(min, active?.type.maxPhotos || PHOTO_DEFAULT_MAX_PHOTOS)
  );
  const canAdd = Boolean(active) && drafts.length < max && !busy;
  const canSend = Boolean(active) && drafts.length >= min && drafts.length <= max && !busy;
  const criteria = parseCriteriaJson(active?.type.criteriaJson);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-app-primary">{t.photoCheck.todayTitle}</h2>
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {progress ? <p className="rounded-2xl border border-ios-blue/30 bg-ios-blue/5 px-4 py-3 text-sm">{progress}</p> : null}
      {result ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">{t.photoCheck.sentToQc}</p> : null}

      {groups.map(([title, rows]) => (
        <section key={title} className="rounded-3xl border border-gray-200 bg-white p-4 dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
          <h3 className="text-lg font-bold text-app-primary">{title}</h3>
          <ul className="mt-3 space-y-2">
            {rows.map((row) => {
              const label = locale === 'ar' ? row.schedule.slotLabelAr : row.schedule.slotLabelEn;
              const done = row.status === 'completed' || row.status === 'excused';
              const due = row.status === 'due' || row.status === 'overdue' || row.status === 'in_progress';
              const isOpen = active?.id === row.id;
              return (
                <li key={row.id} id={`photo-task-${row.id}`} className="space-y-2">
                  <div
                    className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-100 px-3 py-3 dark:border-ios-dark-separator${
                      highlightId === row.id ? ' photo-task-highlight' : ''
                    }`}
                  >
                    <div>
                      <p className="font-medium text-app-primary">{label}</p>
                      <p className="text-xs text-app-muted">
                        {done ? t.photoCheck.completed : due ? t.photoCheck.dueNow : t.photoCheck.upcoming}
                      </p>
                    </div>
                    {done ? null : (
                      <button
                        type="button"
                        className={`min-h-11 rounded-full px-4 text-sm font-bold ${
                          isOpen
                            ? 'border border-gray-300 bg-white text-app-primary dark:border-ios-dark-separator dark:bg-ios-dark-elevated'
                            : 'bg-ios-blue text-white'
                        }`}
                        onClick={() => (isOpen ? closeTask() : openTask(row))}
                      >
                        {isOpen ? t.photoCheck.closeTask : t.photoCheck.openTask}
                      </button>
                    )}
                  </div>
                  {isOpen && active ? (
                    <div
                      id={`photo-task-active-${active.id}`}
                      className={`scroll-mt-24 rounded-3xl border border-ios-blue/30 bg-ios-blue/5 p-4 space-y-3${
                        highlightId === active.id ? ' photo-task-highlight' : ''
                      }`}
                    >
                      <p className="font-semibold">{locale === 'ar' ? active.type.titleAr : active.type.titleEn}</p>
                      {active.type.code === PHOTO_360_CODE ? (
                        <p className="text-sm text-app-muted">{t.photoCheck.cornersHint}</p>
                      ) : null}
                      {active.type.handwrittenNote ? (
                        <p className="text-xs text-app-muted">{active.type.handwrittenNote}</p>
                      ) : null}
                      {criteria.length ? (
                        <div>
                          <p className="text-xs font-semibold text-app-primary">{t.photoCheck.lookFor}</p>
                          <ul className="mt-1 list-disc ps-5 text-xs text-app-muted">
                            {criteria.map((c) => (
                              <li key={c.key}>{locale === 'ar' ? c.labelAr || c.labelEn : c.labelEn}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p className="text-xs text-app-muted">
                        {t.photoCheck.photoCount.replace('{count}', String(drafts.length)).replace('{max}', String(max))}
                      </p>
                      {drafts.length < min ? (
                        <p className="text-xs text-app-muted">{t.photoCheck.needMorePhotos.replace('{min}', String(min))}</p>
                      ) : null}
                      {active.type.requiresMeasurement ? (
                        <input
                          className="min-h-11 w-full rounded-xl border px-3"
                          placeholder={active.type.measurementUnit ? `${active.type.measurementUnit}` : ''}
                          value={measured}
                          onChange={(e) => setMeasured(e.target.value)}
                        />
                      ) : null}
                      {drafts.length ? (
                        <ul className="grid grid-cols-3 gap-2">
                          {drafts.map((d, i) => (
                            <li key={d.preview} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={d.preview} alt="" className="h-24 w-full rounded-xl object-cover" />
                              <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white disabled:opacity-50"
                                  onClick={() => {
                                    if (busy || submittingRef.current) return;
                                    replaceIndexRef.current = i;
                                    cameraRef.current?.click();
                                  }}
                                >
                                  {t.photoCheck.replacePhoto}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white disabled:opacity-50"
                                  onClick={() => removeDraft(i)}
                                >
                                  {t.photoCheck.removePhoto}
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => addFiles(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={!canAdd}
                        className="min-h-12 w-full rounded-full border border-ios-blue font-bold text-ios-blue disabled:opacity-50"
                        onClick={() => {
                          replaceIndexRef.current = null;
                          cameraRef.current?.click();
                        }}
                      >
                        {drafts.length ? t.photoCheck.addAnotherPhoto : t.photoCheck.takePhoto}
                      </button>
                      <button
                        type="button"
                        disabled={!canSend}
                        className="min-h-12 w-full rounded-full bg-ios-blue font-bold text-white disabled:opacity-50"
                        onClick={() => void submit()}
                      >
                        {busy ? t.photoCheck.reviewing : t.photoCheck.sendToQc}
                      </button>
                      {busy ? (
                        <button
                          type="button"
                          className="min-h-11 w-full rounded-full border text-sm"
                          onClick={() => {
                            cancelInFlight();
                            setError(t.photoCheck.submitCancelled);
                          }}
                        >
                          {t.photoCheck.cancelSend}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {lockedWave.length ? (
        <section className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-ios-dark-separator dark:bg-ios-dark-elevated/60">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-app-secondary">{t.photoCheck.nextWindowTitle}</h3>
              <p className="text-xs text-app-muted">
                {interpolate(t.photoCheck.opensAt, {
                  time: formatAppDateTime(lockedWave[0].windowStartAt ?? lockedWave[0].dueAt, locale),
                })}
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums tracking-tight text-app-secondary">
              {interpolate(t.photoCheck.availableIn, {
                time: formatPhotoCountdown(remainingMs, locale === 'ar' ? 'ar' : 'en'),
              })}
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {lockedWave.map((row) => {
              const label = locale === 'ar' ? row.schedule.slotLabelAr : row.schedule.slotLabelEn;
              const title = locale === 'ar' ? row.type.titleAr : row.type.titleEn;
              return (
                <li
                  key={row.id}
                  id={`photo-task-${row.id}`}
                  className={`flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white/70 px-3 py-3 opacity-60 grayscale dark:border-ios-dark-separator dark:bg-black/20${
                    highlightId === row.id ? ' photo-task-highlight grayscale-0 opacity-100' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-app-primary">{title}</p>
                    <p className="text-xs text-app-muted">
                      {label} · {t.photoCheck.lockedUntil}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-500 dark:bg-white/10">
                    {formatPhotoCountdown(
                      Math.max(0, new Date(row.windowStartAt ?? row.dueAt).getTime() - nowTick),
                      locale === 'ar' ? 'ar' : 'en'
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {groups.length === 0 && lockedWave.length === 0 ? (
        <p className="text-sm text-app-muted">{t.photoCheck.noTasksToday}</p>
      ) : null}
    </div>
  );
}

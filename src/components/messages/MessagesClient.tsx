'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { attachPullToRefresh } from '@/lib/attach-pull-to-refresh';

type ThreadRow = {
  id: string;
  updatedAt: string;
  otherUserId: string;
  otherDisplayName: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

type MessageRow = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  readByPeer: boolean;
};

type PeerUser = { id: string; displayName: string; role: string };

const POLL_MS = 4000;
const TYPING_DEBOUNCE_MS = 600;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function MessagesClient({ currentUserId }: { currentUserId: string }) {
  const { t } = useLanguage();
  const c = t.chat;
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get('thread');

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [contacts, setContacts] = useState<PeerUser[]>([]);
  const [threadsErr, setThreadsErr] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [messagesErr, setMessagesErr] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const threadListScrollRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [peersErr, setPeersErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const activeThreadId = selectedId ?? threadFromUrl;

  const loadThreads = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        if (!opts?.silent) setLoadingThreads(true);
        const res = await fetch('/api/chat/threads', { credentials: 'include' });
        const j = (await res.json().catch(() => ({}))) as { threads?: ThreadRow[]; error?: string };
        if (!res.ok) {
          setThreadsErr(j.error ?? c.loadThreadsFailed);
          return;
        }
        setThreadsErr(null);
        setThreads(j.threads ?? []);
      } catch {
        setThreadsErr(c.loadThreadsFailed);
      } finally {
        setLoadingThreads(false);
      }
    },
    [c.loadThreadsFailed]
  );

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/users', { credentials: 'include' });
      const j = (await res.json().catch(() => ({}))) as { users?: PeerUser[] };
      if (res.ok) setContacts(j.users ?? []);
    } catch {
      /* optional */
    }
  }, []);

  const loadMessages = useCallback(
    async (threadId: string, opts?: { silent?: boolean }) => {
      if (!threadId) return;
      const silent = !!opts?.silent;
      if (!silent) {
        setLoadingMessages(true);
        setMessagesErr(null);
      }
      try {
        const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
          credentials: 'include',
        });
        const j = (await res.json().catch(() => ({}))) as {
          messages?: MessageRow[];
          peerLastReadAt?: string | null;
          error?: string;
        };
        if (!res.ok) {
          if (!silent) setMessagesErr(j.error ?? c.loadMessagesFailed);
          return;
        }
        setMessages(j.messages ?? []);
        setPeerLastReadAt(j.peerLastReadAt ?? null);
        await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {});
        void loadThreads({ silent: true });
      } catch {
        if (!silent) setMessagesErr(c.loadMessagesFailed);
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [c.loadMessagesFailed, loadThreads]
  );

  useEffect(() => {
    void (async () => {
      await Promise.all([loadThreads({ silent: false }), loadContacts()]);
    })();
  }, [loadThreads, loadContacts]);

  useEffect(() => {
    if (threadFromUrl && threadFromUrl !== selectedId) {
      setSelectedId(threadFromUrl);
    }
  }, [threadFromUrl, selectedId]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      lastMessageIdRef.current = null;
      return;
    }
    void loadMessages(activeThreadId, { silent: false });
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void loadThreads({ silent: true });
      if (activeThreadId) void loadMessages(activeThreadId, { silent: true });
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [loadThreads, loadMessages, activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch(`/api/chat/threads/${encodeURIComponent(activeThreadId)}/typing`, {
          credentials: 'include',
        });
        const j = (await res.json().catch(() => ({}))) as { typingUserIds?: string[] };
        const ids = j.typingUserIds ?? [];
        const names = ids
          .map((uid) => threads.find((x) => x.otherUserId === uid)?.otherDisplayName)
          .filter((x): x is string => !!x);
        setTypingNames(names);
      } catch {
        /* ignore */
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [activeThreadId, threads]);

  const lastMsgId = messages.length ? messages[messages.length - 1]!.id : null;
  useEffect(() => {
    if (!lastMsgId || lastMsgId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastMsgId;
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [lastMsgId]);

  function setThreadInUrl(threadId: string | null) {
    const path = '/dashboard/messages';
    if (!threadId) {
      router.replace(path);
      return;
    }
    router.replace(`${path}?thread=${encodeURIComponent(threadId)}`);
  }

  function closeConversation() {
    setSelectedId(null);
    setThreadInUrl(null);
    setTypingNames([]);
    setDraft('');
  }

  async function openPeerPicker() {
    setPickerOpen(true);
    setPeersErr(null);
    await loadContacts();
  }

  async function startWithUser(otherUserId: string) {
    setStarting(true);
    setPeersErr(null);
    try {
      const res = await fetch('/api/chat/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otherUserId }),
      });
      const j = (await res.json().catch(() => ({}))) as { threadId?: string; error?: string };
      if (!res.ok || !j.threadId) {
        setPeersErr(j.error ?? c.startThreadFailed);
        return;
      }
      setPickerOpen(false);
      setSelectedId(j.threadId);
      setThreadInUrl(j.threadId);
      await loadThreads({ silent: true });
      await loadMessages(j.threadId, { silent: false });
    } catch {
      setPeersErr(c.startThreadFailed);
    } finally {
      setStarting(false);
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!activeThreadId || !text || sending) return;
    setSending(true);
    setMessagesErr(null);
    try {
      const res = await fetch(`/api/chat/threads/${encodeURIComponent(activeThreadId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text }),
      });
      const j = (await res.json().catch(() => ({}))) as { message?: MessageRow; error?: string };
      if (!res.ok) {
        setMessagesErr(j.error ?? c.sendFailed);
        return;
      }
      setDraft('');
      if (j.message) setMessages((prev) => [...prev, j.message!]);
      void loadThreads({ silent: true });
    } catch {
      setMessagesErr(c.sendFailed);
    } finally {
      setSending(false);
    }
  }

  function touchTyping(active: boolean) {
    if (!activeThreadId) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!active) return;
    typingTimerRef.current = window.setTimeout(() => {
      void fetch(`/api/chat/threads/${encodeURIComponent(activeThreadId)}/typing`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    }, TYPING_DEBOUNCE_MS);
  }

  const activeTitle = useMemo(() => {
    if (!activeThreadId) return '';
    return threads.find((x) => x.id === activeThreadId)?.otherDisplayName ?? c.conversation;
  }, [activeThreadId, threads, c.conversation]);

  const threadPeerIds = useMemo(() => new Set(threads.map((th) => th.otherUserId)), [threads]);

  const contactsNotInThread = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return contacts.filter((p) => {
      if (threadPeerIds.has(p.id)) return false;
      if (!q) return true;
      return p.displayName.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
    });
  }, [contacts, threadPeerIds, searchQuery]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (th) =>
        th.otherDisplayName.toLowerCase().includes(q) ||
        (th.lastMessageBody?.toLowerCase().includes(q) ?? false)
    );
  }, [threads, searchQuery]);

  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const ta = new Date(a.lastMessageAt ?? a.updatedAt).getTime();
      const tb = new Date(b.lastMessageAt ?? b.updatedAt).getTime();
      return tb - ta;
    });
  }, [filteredThreads]);

  const refreshThreadList = useCallback(() => {
    startTransition(() => router.refresh());
    void loadThreads({ silent: false });
    void loadContacts();
  }, [router, loadThreads, loadContacts]);

  const refreshActiveThread = useCallback(() => {
    startTransition(() => router.refresh());
    void loadThreads({ silent: true });
    if (activeThreadId) void loadMessages(activeThreadId, { silent: false });
  }, [router, activeThreadId, loadThreads, loadMessages]);

  useEffect(() => {
    const el = threadListScrollRef.current;
    if (!el) return;
    return attachPullToRefresh(el, refreshThreadList, {
      canRefresh: () => !loadingThreads,
    });
  }, [refreshThreadList, loadingThreads]);

  useEffect(() => {
    if (!activeThreadId) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    return attachPullToRefresh(el, refreshActiveThread, {
      canRefresh: () => !(loadingMessages && messages.length === 0),
    });
  }, [activeThreadId, refreshActiveThread, loadingMessages, messages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#efeae2] text-app-primary dark:bg-zinc-950">
      {/* List + optional chat: WhatsApp-style split on md+ */}
      <div
        className={`flex flex-1 min-h-0 min-w-0 ${
          activeThreadId ? 'md:flex-row' : 'flex-col'
        }`}
      >
        {/* Conversations column */}
        <aside
          id="section-messages-list"
          className={`flex flex-col min-h-0 border-gray-200/80 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated shadow-sm dark:shadow-none scroll-mt-28 ${
            activeThreadId ? 'hidden md:flex md:w-[min(100%,380px)] md:shrink-0 md:border-e' : 'flex w-full max-w-2xl mx-auto md:max-w-xl'
          }`}
        >
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-200/90 dark:border-ios-dark-separator bg-[#f0f2f5] dark:bg-ios-dark-elevated-2/80">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-ios-dark-label">{c.chatsTitle}</h1>
              <button
                type="button"
                onClick={() => void openPeerPicker()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ios-blue text-white shadow-md hover:opacity-90 active:scale-95 transition"
                aria-label={c.newChat}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
            <label className="sr-only" htmlFor="msg-search">
              {c.searchPeople}
            </label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                id="msg-search"
                type="search"
                className="w-full rounded-xl border-0 bg-white dark:bg-ios-dark-fill py-2.5 ps-10 pe-3 text-sm text-gray-900 dark:text-ios-dark-label placeholder:text-gray-400 shadow-inner ring-1 ring-gray-200/80 dark:ring-ios-dark-separator focus:ring-2 focus:ring-ios-blue/40 outline-none"
                placeholder={c.searchPeople}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <p className="shrink-0 px-4 py-1.5 text-[11px] text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-ios-dark-separator/60">
            {c.retentionHint}
          </p>

          {threadsErr ? (
            <p className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{threadsErr}</p>
          ) : null}

          <div
            ref={threadListScrollRef}
            className="min-h-0 flex-1 overflow-y-hidden overscroll-none md:overflow-y-auto md:overscroll-contain"
            style={{ touchAction: 'none' }}
          >
            {loadingThreads ? (
              <div className="flex flex-col gap-0 px-2 py-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-zinc-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded bg-gray-200 dark:bg-zinc-700" />
                      <div className="h-2 w-48 rounded bg-gray-100 dark:bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {sortedThreads.length > 0 ? (
                  <div>
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700/90 dark:text-teal-400/90">
                      {c.chatsSection}
                    </p>
                    <ul>
                      {sortedThreads.map((th) => (
                        <li key={th.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(th.id);
                              setThreadInUrl(th.id);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-100/90 dark:hover:bg-ios-dark-fill/80 ${
                              activeThreadId === th.id ? 'bg-teal-50/80 dark:bg-teal-950/25' : ''
                            }`}
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700 dark:bg-zinc-600 dark:text-zinc-100">
                              {initials(th.otherDisplayName)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate font-medium text-gray-900 dark:text-ios-dark-label">
                                  {th.otherDisplayName}
                                </span>
                                <span className="shrink-0 text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                                  {formatListTime(th.lastMessageAt ?? th.updatedAt)}
                                </span>
                              </span>
                              <span className="mt-0.5 flex items-center gap-2">
                                <span className="truncate text-sm text-gray-600 dark:text-zinc-400">
                                  {th.lastMessageBody ?? c.tapToOpen}
                                </span>
                                {th.unreadCount > 0 ? (
                                  <span className="shrink-0 min-w-[1.25rem] rounded-full bg-teal-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
                                    {th.unreadCount > 99 ? '99+' : th.unreadCount}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="border-t border-gray-100 dark:border-ios-dark-separator/80">
                  <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700/90 dark:text-teal-400/90">
                    {c.everyoneSection}
                  </p>
                  {contactsNotInThread.length === 0 && sortedThreads.length === 0 && !loadingThreads ? (
                    <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-zinc-400">{c.noThreads}</p>
                  ) : contactsNotInThread.length === 0 ? (
                    <p className="px-4 py-3 text-center text-xs text-gray-500 dark:text-zinc-500">{c.noContactsMatch}</p>
                  ) : (
                    <ul>
                      {contactsNotInThread.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            disabled={starting}
                            onClick={() => void startWithUser(p.id)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-gray-100/90 dark:hover:bg-ios-dark-fill/80 disabled:opacity-50"
                          >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600/15 text-sm font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                              {initials(p.displayName)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900 dark:text-ios-dark-label">{p.displayName}</span>
                              <span className="mt-0.5 block text-xs text-gray-500 dark:text-zinc-400">{c.tapToChat}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Chat panel — only when a thread is selected */}
        {activeThreadId ? (
          <section
            id="section-messages-thread"
            className="flex min-h-0 min-w-0 flex-1 flex-col scroll-mt-28 bg-[#e5ddd5] dark:bg-zinc-900 md:border-s md:border-gray-200/60 dark:md:border-ios-dark-separator"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-gray-300/60 bg-[#f0f2f5] dark:bg-ios-dark-elevated-2 px-2 py-2 dark:border-ios-dark-separator">
              <button
                type="button"
                onClick={closeConversation}
                className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
                aria-label={c.backToList}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-gray-800 dark:bg-zinc-600 dark:text-zinc-100">
                {initials(activeTitle)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-gray-900 dark:text-ios-dark-label">{activeTitle}</h2>
                {typingNames.length > 0 ? (
                  <p className="truncate text-xs text-teal-700 dark:text-teal-400">{c.typing}: {typingNames.join(', ')}</p>
                ) : peerLastReadAt ? (
                  <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400">
                    {c.peerSeen} · {new Date(peerLastReadAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </header>

            <div
              ref={messagesScrollRef}
              className="relative min-h-0 flex-1 overflow-y-hidden px-2 py-3 md:overflow-y-auto"
              style={{ touchAction: 'none' }}
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden />
                </div>
              ) : null}
              {messagesErr ? (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{messagesErr}</p>
              ) : null}
              <div className="space-y-1.5 pb-2">
                {messages.map((m) => {
                  const mine = m.senderUserId === currentUserId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[min(85%,20rem)] rounded-lg px-2.5 py-1.5 text-[15px] leading-snug shadow-sm ${
                          mine
                            ? 'rounded-br-sm bg-[#dcf8c6] text-gray-900 dark:bg-teal-900/50 dark:text-zinc-100'
                            : 'rounded-bl-sm bg-white text-gray-900 dark:bg-zinc-800 dark:text-zinc-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <div
                          className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] tabular-nums ${
                            mine ? 'text-gray-600/90 dark:text-zinc-400' : 'text-gray-500 dark:text-zinc-500'
                          }`}
                        >
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                          {mine && m.readByPeer ? <span className="text-teal-700 dark:text-teal-400">✓ {c.read}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={listEndRef} className="h-px" />
              </div>
            </div>

            <footer className="shrink-0 border-t border-gray-300/50 bg-[#f0f2f5] px-2 py-2 dark:border-ios-dark-separator dark:bg-ios-dark-elevated-2">
              <div className="flex items-end gap-2 rounded-2xl bg-white px-2 py-1.5 shadow-sm dark:bg-zinc-800">
                <textarea
                  className="max-h-28 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  rows={1}
                  placeholder={c.messagePlaceholder}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    touchTyping(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={() => void sendMessage()}
                  className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow disabled:opacity-40"
                  aria-label={c.send}
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 translate-x-px">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </footer>
          </section>
        ) : null}
      </div>

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-ios-dark-elevated sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-ios-dark-separator">
              <h2 className="text-base font-semibold">{c.chooseContact}</h2>
              <button type="button" className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-ios-dark-fill" onClick={() => setPickerOpen(false)}>
                {t.common.close}
              </button>
            </div>
            {peersErr ? <p className="px-4 py-2 text-sm text-red-600">{peersErr}</p> : null}
            <ul className="overflow-y-auto p-2">
              {contacts.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={starting}
                    onClick={() => void startWithUser(u.id)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-ios-dark-fill disabled:opacity-50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-600/15 text-sm font-semibold text-teal-900 dark:text-teal-200">
                      {initials(u.displayName)}
                    </span>
                    <span>
                      <span className="font-medium text-gray-900 dark:text-ios-dark-label">{u.displayName}</span>
                      <span className="ms-2 text-xs text-gray-500">{u.role}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

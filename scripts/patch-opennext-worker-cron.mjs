/**
 * Injects a Cloudflare `scheduled` handler into the OpenNext-generated worker so
 * Wrangler `triggers.crons` can run `/api/cron/time-clock` via WORKER_SELF_REFERENCE
 * (no third-party HTTP cron).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, '..', '.open-next', 'worker.js');

if (!fs.existsSync(workerPath)) {
  console.error('[patch-opennext-worker-cron] .open-next/worker.js not found; run opennextjs-cloudflare build first');
  process.exit(1);
}

const SCHEDULED_HANDLER = `async scheduled(event, env, ctx) {
        const secret = env.CRON_SECRET;
        if (!secret) return;
        const ref = env.WORKER_SELF_REFERENCE;
        if (!ref || typeof ref.fetch !== "function") {
            console.error("[scheduled] WORKER_SELF_REFERENCE missing");
            return;
        }
        let scheduledDbFailLoggedAt = 0;
        const logScheduledFail = (label, detail) => {
            const now = Date.now();
            if (now - scheduledDbFailLoggedAt < 3600000) return;
            scheduledDbFailLoggedAt = now;
            console.error(label, detail);
        };
        const base =
            (typeof env.WORKER_PUBLIC_URL === "string" && env.WORKER_PUBLIC_URL) ||
            "https://drinkat-management.technologiesbrightminds.workers.dev";
        const url = new URL(base.replace(/\\/$/, "") + "/api/cron/time-clock");
        url.searchParams.set("secret", secret);
        try {
            const res = await ref.fetch(new Request(url, { method: "GET" }));
            if (!res.ok) {
                const t = await res.text().catch(() => "");
                logScheduledFail("[scheduled] cron failed", res.status + " " + t.slice(0, 200));
            }
        } catch (e) {
            logScheduledFail("[scheduled] cron error", e);
        }
    }`;

let s = fs.readFileSync(workerPath, 'utf8');

const scheduledStart = s.indexOf('async scheduled(event');
if (scheduledStart !== -1) {
  const closeIdx = s.indexOf('\n    },', scheduledStart);
  if (closeIdx === -1) {
    console.error('[patch-opennext-worker-cron] could not find end of scheduled handler');
    process.exit(1);
  }
  s = s.slice(0, scheduledStart) + SCHEDULED_HANDLER + s.slice(closeIdx);
  fs.writeFileSync(workerPath, s);
  console.log('[patch-opennext-worker-cron] updated scheduled handler');
  process.exit(0);
}

if (s.includes('logScheduledFail')) {
  console.log('[patch-opennext-worker-cron] already patched');
  process.exit(0);
}

const needle = `        });
    },
};`;
const idx = s.lastIndexOf(needle);
if (idx === -1) {
  console.error('[patch-opennext-worker-cron] could not find export default closing; OpenNext layout may have changed');
  process.exit(1);
}

const insert = `        });
    },
    ${SCHEDULED_HANDLER},
};`;

s = s.slice(0, idx) + insert;
fs.writeFileSync(workerPath, s);
console.log('[patch-opennext-worker-cron] ok');

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

let s = fs.readFileSync(workerPath, 'utf8');
if (s.includes('async scheduled(event')) {
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
    async scheduled(event, env, ctx) {
        const secret = env.CRON_SECRET;
        if (!secret) return;
        const ref = env.WORKER_SELF_REFERENCE;
        if (!ref || typeof ref.fetch !== "function") {
            console.error("[scheduled] WORKER_SELF_REFERENCE missing");
            return;
        }
        const url = new URL("https://internal/api/cron/time-clock");
        url.searchParams.set("secret", secret);
        try {
            const res = await ref.fetch(new Request(url, { method: "GET" }));
            if (!res.ok) {
                const t = await res.text().catch(() => "");
                console.error("[scheduled] cron failed", res.status, t.slice(0, 200));
            }
        } catch (e) {
            console.error("[scheduled] cron error", e);
        }
    },
};`;

s = s.slice(0, idx) + insert;
fs.writeFileSync(workerPath, s);
console.log('[patch-opennext-worker-cron] ok');

/** Simple offline cache + write queue.
 * - Caches API GET responses in localStorage (best-effort).
 * - Queues POST/PATCH/DELETE requests while offline; flushes on reconnect.
 */
import { api } from "@/lib/api";

const CACHE_PREFIX = "nk_cache:";
const QUEUE_KEY = "nk_queue";

export function readCache(url) {
  try {
    const v = localStorage.getItem(CACHE_PREFIX + url);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

export function writeCache(url, data) {
  try { localStorage.setItem(CACHE_PREFIX + url, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}

export function enqueue(req) {
  const q = getQueue();
  q.push({ ...req, id: Date.now() + Math.random(), queued_at: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export async function flushQueue() {
  const q = getQueue();
  if (!q.length) return { flushed: 0 };
  const remaining = [];
  let flushed = 0;
  for (const item of q) {
    try {
      await api.request({ method: item.method, url: item.url, data: item.data });
      flushed++;
    } catch (e) {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { flushed, remaining: remaining.length };
}

// Install axios interceptors — cache GETs, queue writes if offline
export function installOffline() {
  api.interceptors.response.use(
    (r) => {
      const { config } = r;
      if ((config.method || "get").toLowerCase() === "get") {
        writeCache(config.url, r.data);
      }
      return r;
    },
    (err) => {
      const cfg = err.config || {};
      const method = (cfg.method || "get").toLowerCase();
      if (!navigator.onLine || err.code === "ERR_NETWORK") {
        if (method === "get") {
          const cached = readCache(cfg.url);
          if (cached) return Promise.resolve({ data: cached.data, cached: true, config: cfg });
        } else if (["post","patch","delete","put"].includes(method)) {
          enqueue({ method, url: cfg.url, data: cfg.data ? JSON.parse(cfg.data) : undefined });
          return Promise.resolve({ data: { queued: true }, config: cfg });
        }
      }
      return Promise.reject(err);
    }
  );
  window.addEventListener("online", () => { flushQueue(); });
}

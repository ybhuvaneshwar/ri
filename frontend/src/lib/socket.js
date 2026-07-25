import { useEffect, useRef, useState } from "react";

export function useLiveSocket(onEvent) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retry = 1000;
    let pingTimer;

    const connect = () => {
      if (cancelled) return;
      const token = localStorage.getItem("nk_token");
      if (!token) return;
      const httpBase = process.env.REACT_APP_BACKEND_URL || "";
      const wsBase = httpBase.replace(/^http/, "ws");
      const url = `${wsBase}/api/ws/live?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retry = 1000;
        pingTimer = setInterval(() => { try { ws.send("ping"); } catch {} }, 30000);
      };
      ws.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          cbRef.current?.(evt);
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false);
        clearInterval(pingTimer);
        if (!cancelled) {
          retry = Math.min(retry * 1.7, 15000);
          setTimeout(connect, retry);
        }
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    };

    connect();
    return () => {
      cancelled = true;
      clearInterval(pingTimer);
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  return { connected, online };
}

"use client";

import { useEffect } from "react";

type Delivery = { id: number; runsBatter: number; extraType?: string | null; wicketType?: string | null };
type LivePayload = { deliveries?: Delivery[] };

export function LiveBoundaryViewer() {
  useEffect(() => {
    if (location.pathname !== "/watch") return;
    const params = new URLSearchParams(location.search);
    const token = params.get("token") ?? "";
    const matchId = params.get("matchId") ?? "";
    if (!token && !matchId) return;
    const query = token ? `token=${encodeURIComponent(token)}` : `matchId=${encodeURIComponent(matchId)}`;

    let initialized = false;
    let lastDeliveryId = 0;
    let activeOverlay: HTMLElement | null = null;
    let removeTimer: number | null = null;

    const clear = () => {
      if (removeTimer) window.clearTimeout(removeTimer);
      removeTimer = null;
      activeOverlay?.remove();
      activeOverlay = null;
    };

    const celebrate = (runs: 4 | 6) => {
      clear();
      const host = document.querySelector<HTMLElement>(".viewer-video");
      if (!host) return;
      const overlay = document.createElement("div");
      overlay.className = `boundary-celebration boundary-${runs}`;
      const sparks = Array.from({ length: runs === 6 ? 18 : 12 }, (_, index) => `<i style="--i:${index}"></i>`).join("");
      overlay.innerHTML = `<div class="boundary-burst">${sparks}</div><div class="boundary-ring"></div><div class="boundary-number">${runs}</div><div class="boundary-copy"><b>${runs === 6 ? "SIX!" : "FOUR!"}</b><span>${runs === 6 ? "MAXIMUM" : "BOUNDARY"}</span></div>`;
      host.appendChild(overlay);
      activeOverlay = overlay;
      removeTimer = window.setTimeout(clear, runs === 6 ? 3600 : 3000);
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/live?${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as LivePayload;
        const deliveries = body.deliveries ?? [];
        const latest = deliveries[deliveries.length - 1];
        if (!latest) return;
        if (!initialized) {
          initialized = true;
          lastDeliveryId = latest.id;
          return;
        }
        if (latest.id <= lastDeliveryId) return;
        lastDeliveryId = latest.id;
        if (!latest.extraType && latest.runsBatter === 4) celebrate(4);
        else if (!latest.extraType && latest.runsBatter === 6) celebrate(6);
      } catch { /* live score remains available */ }
    };

    const timer = window.setInterval(() => void poll(), 900);
    void poll();
    return () => {
      window.clearInterval(timer);
      clear();
    };
  }, []);
  return null;
}

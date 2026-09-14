"use client";

import { useEffect } from "react";

type ReplayState = {
  active?: boolean;
  replay?: { url?: string; until?: string | null; sequence?: number; durationMs?: number } | null;
};

export function LiveReplayViewer() {
  useEffect(() => {
    if (location.pathname !== "/watch") return;
    const params = new URLSearchParams(location.search);
    const token = params.get("token") ?? "";
    const matchId = params.get("matchId") ?? "";
    if (!token && !matchId) return;
    const query = token ? `token=${encodeURIComponent(token)}` : `matchId=${encodeURIComponent(matchId)}`;
    let lastSequence = 0;
    let activeOverlay: HTMLElement | null = null;
    let fallbackTimer: number | null = null;
    let stopped = false;

    const clearReplay = () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
      activeOverlay?.remove();
      activeOverlay = null;
      const rtc = document.querySelector<HTMLVideoElement>(".rtc-live-video");
      if (rtc) void rtc.play().catch(() => undefined);
    };

    const showReplay = (replay: NonNullable<ReplayState["replay"]>) => {
      if (!replay.url) return;
      clearReplay();
      const host = document.querySelector<HTMLElement>(".viewer-video");
      if (!host) return;
      const overlay = document.createElement("div");
      overlay.className = "instant-replay-overlay";
      overlay.innerHTML = '<div class="instant-replay-label"><b>↻ REPLAY</b><span>CORE CRICKET</span></div><video class="instant-replay-video" playsinline></video><button class="instant-replay-sound" hidden>Tap for replay sound</button><div class="instant-replay-return">LIVE feed continues in background</div>';
      host.appendChild(overlay);
      activeOverlay = overlay;
      const video = overlay.querySelector<HTMLVideoElement>("video")!;
      const soundButton = overlay.querySelector<HTMLButtonElement>(".instant-replay-sound")!;
      video.src = replay.url;
      video.autoplay = true;
      video.playsInline = true;
      video.controls = false;
      video.muted = false;
      video.onended = clearReplay;
      video.onerror = clearReplay;
      const tryPlay = () => void video.play().catch(() => { soundButton.hidden = false; });
      video.oncanplay = tryPlay;
      soundButton.onclick = () => { video.muted = false; void video.play(); soundButton.hidden = true; };
      tryPlay();
      fallbackTimer = window.setTimeout(clearReplay, Math.max(6000, (replay.durationMs ?? 10000) + 4000));
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const response = await fetch(`/api/live/replay?${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as ReplayState;
        const sequence = body.replay?.sequence ?? 0;
        if (body.replay?.url && sequence > lastSequence) {
          lastSequence = sequence;
          showReplay(body.replay);
        }
        if (body.active === false) clearReplay();
      } catch { /* keep live stream visible */ }
    };

    const timer = window.setInterval(() => void poll(), 800);
    void poll();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      clearReplay();
    };
  }, []);
  return null;
}

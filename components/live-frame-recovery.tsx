"use client";

import { useEffect } from "react";

export function LiveFrameRecovery() {
  useEffect(() => {
    if (!window.location.pathname.startsWith("/watch")) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let resolvedToken = new URLSearchParams(window.location.search).get("token") ?? "";
    const matchId = new URLSearchParams(window.location.search).get("matchId") ?? "";

    const clearRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = null;
    };

    const schedule = (delay: number, fn: () => void) => {
      clearRetry();
      retryTimer = window.setTimeout(fn, delay);
    };

    const resolveToken = async () => {
      if (resolvedToken || !matchId) return resolvedToken;
      try {
        const response = await fetch(`/api/live?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" });
        if (!response.ok) return "";
        const body = await response.json() as { token?: string };
        resolvedToken = body.token ?? "";
      } catch {
        resolvedToken = "";
      }
      return resolvedToken;
    };

    const showFrame = (src: string) => {
      const stage = document.querySelector<HTMLElement>(".viewer-video");
      if (!stage) return;
      let recovery = stage.querySelector<HTMLImageElement>(".live-camera-recovery");
      if (!recovery) {
        recovery = document.createElement("img");
        recovery.className = "live-camera-recovery";
        recovery.alt = "Live cricket camera";
        stage.prepend(recovery);
      }
      recovery.src = src;
      const original = stage.querySelector<HTMLImageElement>(".live-camera-frame");
      if (original) original.style.display = "none";
      const waiting = stage.querySelector<HTMLElement>(".camera-waiting");
      if (waiting) waiting.style.display = "none";
    };

    const poll = async () => {
      if (cancelled) return;
      const token = await resolveToken();
      if (!token) {
        schedule(1200, poll);
        return;
      }

      const src = `/api/live/frame?token=${encodeURIComponent(token)}&v=${Date.now()}`;
      const probe = new Image();
      probe.onload = () => {
        if (cancelled) return;
        showFrame(src);
        schedule(900, poll);
      };
      probe.onerror = () => {
        if (cancelled) return;
        schedule(1200, poll);
      };
      probe.src = src;
    };

    void poll();
    return () => {
      cancelled = true;
      clearRetry();
    };
  }, []);

  return null;
}

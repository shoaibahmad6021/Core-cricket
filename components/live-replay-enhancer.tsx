"use client";

import { useEffect } from "react";

function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function LiveReplayEnhancer() {
  useEffect(() => {
    if (location.pathname === "/watch") return;

    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let chunks: Blob[] = [];
    let startedAt = 0;
    let selectedSeconds = 10;
    let panel: HTMLElement | null = null;
    let status: HTMLElement | null = null;
    let replayButton: HTMLButtonElement | null = null;
    let finalizing = false;

    const bufferedSeconds = () => startedAt ? Math.max(0, Math.min(20, Math.floor((Date.now() - startedAt) / 1000))) : 0;
    const updateStatus = () => {
      if (!status) return;
      const buffered = bufferedSeconds();
      if (!recorder || recorder.state === "inactive") status.textContent = "Start Live to build the replay buffer.";
      else status.textContent = buffered >= 3 ? `${buffered}s buffered · replay ready` : `Buffering ${buffered}s…`;
      if (replayButton) replayButton.disabled = finalizing || !recorder || recorder.state === "inactive" || buffered < 3;
    };

    const makeRecorder = (source: MediaStream) => {
      const mimeType = preferredMime();
      try {
        return mimeType
          ? new MediaRecorder(source, { mimeType, videoBitsPerSecond: 900000, audioBitsPerSecond: 64000 })
          : new MediaRecorder(source, { videoBitsPerSecond: 900000, audioBitsPerSecond: 64000 });
      } catch { return new MediaRecorder(source); }
    };

    const startRecorder = (source: MediaStream) => {
      chunks = [];
      stream = source;
      recorder = makeRecorder(source);
      startedAt = Date.now();
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { if (status) status.textContent = "Replay buffer unavailable on this browser."; if (replayButton) replayButton.disabled = true; };
      recorder.start(1000);
      updateStatus();
    };

    const stopAndDiscard = () => {
      const current = recorder;
      recorder = null;
      chunks = [];
      startedAt = 0;
      if (current && current.state !== "inactive") { current.onstop = null; try { current.stop(); } catch { /* ignore */ } }
      updateStatus();
    };

    const rotateBuffer = () => {
      if (!stream || !recorder || recorder.state === "inactive" || finalizing) return;
      const source = stream;
      stopAndDiscard();
      if (source.getVideoTracks().some((track) => track.readyState === "live")) startRecorder(source);
    };

    const findMatchId = () => {
      const input = document.querySelector<HTMLInputElement>(".watch-share input");
      if (!input?.value) return 0;
      try { return Number(new URL(input.value, location.origin).searchParams.get("matchId") ?? 0); }
      catch { return 0; }
    };

    const finalizeClip = async () => {
      const current = recorder;
      const source = stream;
      const clipChunks = chunks;
      const clipStarted = startedAt;
      if (!current || !source || current.state === "inactive") return null;
      finalizing = true;
      if (replayButton) replayButton.disabled = true;

      const result = await new Promise<{ blob: Blob; durationSec: number } | null>((resolve) => {
        const finish = () => {
          const type = current.mimeType || clipChunks[0]?.type || "video/webm";
          const blob = clipChunks.length ? new Blob(clipChunks, { type }) : null;
          resolve(blob ? { blob, durationSec: Math.max(3, Math.min(20, Math.round((Date.now() - clipStarted) / 1000))) } : null);
        };
        current.onstop = finish;
        try {
          current.requestData();
          window.setTimeout(() => { try { current.stop(); } catch { finish(); } }, 150);
        } catch { try { current.stop(); } catch { finish(); } }
      });

      recorder = null;
      chunks = [];
      startedAt = 0;
      if (source.getVideoTracks().some((track) => track.readyState === "live")) startRecorder(source);
      finalizing = false;
      return result;
    };

    const triggerReplay = async () => {
      const matchId = findMatchId();
      if (!matchId || !recorder || recorder.state === "inactive" || bufferedSeconds() < 3) {
        if (status) status.textContent = "Keep Live running for a few seconds before replay.";
        return;
      }
      if (status) status.textContent = "Finalizing replay…";
      const clip = await finalizeClip();
      if (!clip?.blob.size) { if (status) status.textContent = "Unable to create replay on this phone."; return; }

      const actualDuration = Math.min(selectedSeconds, clip.durationSec);
      const form = new FormData();
      form.set("matchId", String(matchId));
      form.set("durationSec", String(actualDuration));
      const handoff = new URLSearchParams(location.search).get("score_handoff");
      if (handoff) form.set("handoffToken", handoff);
      const type = clip.blob.type || "video/webm";
      form.set("file", clip.blob, type.includes("mp4") ? "replay.mp4" : "replay.webm");

      try {
        const response = await fetch("/api/live/replay", { method: "POST", body: form });
        const body = await response.json() as { error?: string; storage?: string };
        if (!response.ok) throw new Error(body.error || "Unable to start replay");
        if (status) status.textContent = `↻ REPLAY ON AIR · ${actualDuration}s · live continues in background`;
        window.setTimeout(updateStatus, actualDuration * 1000 + 1000);
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : "Unable to start replay";
        if (replayButton) replayButton.disabled = false;
      }
    };

    const ensurePanel = () => {
      const controls = document.querySelector<HTMLElement>(".studio-controls");
      if (!controls) { panel?.remove(); panel = null; status = null; replayButton = null; return; }
      if (!panel || !document.body.contains(panel)) {
        panel = document.createElement("div");
        panel.className = "card instant-replay-card";
        panel.innerHTML = '<span>INSTANT REPLAY</span><h3>Replay the previous ball</h3><p>The broadcast phone keeps a short complete camera + commentary clip. LIVE continues underneath while viewers watch the replay.</p><div class="replay-lengths"><button data-seconds="10" class="active">10 sec</button><button data-seconds="15">15 sec</button><button data-seconds="20">20 sec</button></div><button class="primary-button replay-now" disabled>↻ Replay</button><small class="replay-status">Start Live to build the replay buffer.</small>';
        const broadcastCard = controls.querySelector(".broadcast-card");
        controls.insertBefore(panel, broadcastCard ?? null);
        status = panel.querySelector<HTMLElement>(".replay-status");
        replayButton = panel.querySelector<HTMLButtonElement>(".replay-now");
        replayButton?.addEventListener("click", () => void triggerReplay());
        panel.querySelectorAll<HTMLButtonElement>(".replay-lengths button").forEach((button) => button.addEventListener("click", () => {
          selectedSeconds = Number(button.dataset.seconds ?? 10);
          panel?.querySelectorAll(".replay-lengths button").forEach((item) => item.classList.toggle("active", item === button));
          updateStatus();
        }));
      }

      const live = Boolean(document.querySelector(".broadcast-badge"));
      const video = document.querySelector<HTMLVideoElement>(".camera-stage video");
      const source = video?.srcObject instanceof MediaStream ? video.srcObject : null;
      if (live && source && source.getVideoTracks().some((track) => track.readyState === "live")) {
        if (!recorder || recorder.state === "inactive") startRecorder(source);
        else if (Date.now() - startedAt >= 20000) rotateBuffer();
      } else if (!live && recorder) {
        stopAndDiscard(); stream = null;
      }
      updateStatus();
    };

    const timer = window.setInterval(ensurePanel, 500);
    const observer = new MutationObserver(ensurePanel);
    observer.observe(document.body, { childList: true, subtree: true });
    ensurePanel();
    return () => { window.clearInterval(timer); observer.disconnect(); stopAndDiscard(); panel?.remove(); };
  }, []);
  return null;
}

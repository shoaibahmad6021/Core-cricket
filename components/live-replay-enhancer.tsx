"use client";

import { useEffect } from "react";

type TimedChunk = { blob: Blob; at: number };

function preferredMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const choices = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return choices.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function LiveReplayEnhancer() {
  useEffect(() => {
    if (location.pathname === "/watch") return;

    let recorder: MediaRecorder | null = null;
    let recordingStream: MediaStream | null = null;
    let chunks: TimedChunk[] = [];
    let selectedSeconds = 10;
    let stopped = false;
    let panel: HTMLElement | null = null;
    let status: HTMLElement | null = null;
    let replayButton: HTMLButtonElement | null = null;

    const stopRecorder = () => {
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* ignore */ }
      }
      recorder = null;
      recordingStream = null;
      chunks = [];
      if (status) status.textContent = "Start Live to build the replay buffer.";
      if (replayButton) replayButton.disabled = true;
    };

    const startRecorder = (stream: MediaStream) => {
      if (recorder && recordingStream === stream && recorder.state !== "inactive") return;
      stopRecorder();
      const mimeType = preferredMime();
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2200000, audioBitsPerSecond: 96000 }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      recordingStream = stream;
      chunks = [];
      recorder.ondataavailable = (event) => {
        if (!event.data.size) return;
        const now = Date.now();
        chunks.push({ blob: event.data, at: now });
        chunks = chunks.filter((item) => item.at >= now - 24000);
        const buffered = chunks.length > 1 ? Math.min(20, Math.max(1, Math.round((now - chunks[0].at) / 1000) + 1)) : chunks.length;
        if (status) status.textContent = buffered >= selectedSeconds ? `${buffered}s buffered · replay ready` : `Buffering ${buffered}s of ${selectedSeconds}s…`;
        if (replayButton) replayButton.disabled = buffered < Math.min(4, selectedSeconds);
      };
      recorder.onerror = () => {
        if (status) status.textContent = "Replay buffer unavailable on this browser.";
        if (replayButton) replayButton.disabled = true;
      };
      recorder.start(1000);
      if (status) status.textContent = `Buffering ${selectedSeconds}s…`;
    };

    const findMatchId = () => {
      const input = document.querySelector<HTMLInputElement>(".watch-share input");
      if (!input?.value) return 0;
      try {
        const url = new URL(input.value, location.origin);
        return Number(url.searchParams.get("matchId") ?? 0);
      } catch { return 0; }
    };

    const triggerReplay = async () => {
      const matchId = findMatchId();
      if (!matchId || !recorder || recorder.state === "inactive" || !chunks.length) {
        if (status) status.textContent = "Replay is still buffering. Keep Live running for a few seconds.";
        return;
      }
      try { recorder.requestData(); } catch { /* timeslice data is enough */ }
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const cutoff = Date.now() - selectedSeconds * 1000 - 900;
      const selected = chunks.filter((item) => item.at >= cutoff);
      const usable = selected.length ? selected : chunks;
      if (!usable.length) return;
      const type = recorder.mimeType || usable[0].blob.type || "video/webm";
      const clip = new Blob(usable.map((item) => item.blob), { type });
      if (replayButton) replayButton.disabled = true;
      if (status) status.textContent = `Preparing ${selectedSeconds}s replay…`;
      const form = new FormData();
      form.set("matchId", String(matchId));
      form.set("durationSec", String(selectedSeconds));
      const handoff = new URLSearchParams(location.search).get("score_handoff");
      if (handoff) form.set("handoffToken", handoff);
      form.set("file", clip, type.includes("mp4") ? "replay.mp4" : "replay.webm");
      try {
        const response = await fetch("/api/live/replay", { method: "POST", body: form });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to start replay");
        if (status) status.textContent = `↻ REPLAY ON AIR · ${selectedSeconds}s · live feed continues in background`;
        window.setTimeout(() => { if (status) status.textContent = `${Math.min(20, chunks.length)}s buffered · replay ready`; if (replayButton) replayButton.disabled = false; }, selectedSeconds * 1000 + 1200);
      } catch (error) {
        if (status) status.textContent = error instanceof Error ? error.message : "Unable to start replay";
        if (replayButton) replayButton.disabled = false;
      }
    };

    const ensurePanel = () => {
      const controls = document.querySelector<HTMLElement>(".studio-controls");
      if (!controls) { panel?.remove(); panel = null; return; }
      if (!panel || !document.body.contains(panel)) {
        panel = document.createElement("div");
        panel.className = "card instant-replay-card";
        panel.innerHTML = '<span>INSTANT REPLAY</span><h3>Replay the previous ball</h3><p>Core Cricket keeps the latest camera + commentary audio locally on this broadcast phone. Viewers return to LIVE automatically after replay.</p><div class="replay-lengths"><button data-seconds="10" class="active">10 sec</button><button data-seconds="15">15 sec</button><button data-seconds="20">20 sec</button></div><button class="primary-button replay-now" disabled>↻ Replay</button><small class="replay-status">Start Live to build the replay buffer.</small>';
        const broadcastCard = controls.querySelector(".broadcast-card");
        controls.insertBefore(panel, broadcastCard ?? null);
        status = panel.querySelector<HTMLElement>(".replay-status");
        replayButton = panel.querySelector<HTMLButtonElement>(".replay-now");
        replayButton?.addEventListener("click", () => void triggerReplay());
        panel.querySelectorAll<HTMLButtonElement>(".replay-lengths button").forEach((button) => button.addEventListener("click", () => {
          selectedSeconds = Number(button.dataset.seconds ?? 10);
          panel?.querySelectorAll(".replay-lengths button").forEach((item) => item.classList.toggle("active", item === button));
          const now = Date.now();
          const buffered = chunks.length > 1 ? Math.min(20, Math.max(1, Math.round((now - chunks[0].at) / 1000) + 1)) : chunks.length;
          if (status) status.textContent = buffered >= selectedSeconds ? `${buffered}s buffered · ${selectedSeconds}s replay ready` : `Buffering ${buffered}s of ${selectedSeconds}s…`;
        }));
      }

      const live = Boolean(document.querySelector(".broadcast-badge"));
      const video = document.querySelector<HTMLVideoElement>(".camera-stage video");
      const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
      if (live && stream && stream.getVideoTracks().some((track) => track.readyState === "live")) startRecorder(stream);
      else if (!live && recorder) stopRecorder();
    };

    const timer = window.setInterval(ensurePanel, 500);
    const observer = new MutationObserver(ensurePanel);
    observer.observe(document.body, { childList: true, subtree: true });
    ensurePanel();
    return () => {
      stopped = true;
      void stopped;
      window.clearInterval(timer);
      observer.disconnect();
      stopRecorder();
      panel?.remove();
    };
  }, []);

  return null;
}

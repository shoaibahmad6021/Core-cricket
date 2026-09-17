"use client";

import { useEffect } from "react";

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
    let chunks: Blob[] = [];
    let segmentStartedAt = 0;
    let selectedSeconds = 10;
    let panel: HTMLElement | null = null;
    let status: HTMLElement | null = null;
    let replayButton: HTMLButtonElement | null = null;
    let finalizing = false;

    const setStatus = (text: string) => {
      if (status && status.textContent !== text) status.textContent = text;
    };

    const updateStatus = () => {
      if (!recorder || recorder.state === "inactive") {
        setStatus("Start Live to build the replay buffer.");
        if (replayButton) replayButton.disabled = true;
        return;
      }
      const buffered = Math.max(0, Math.min(20, Math.floor((Date.now() - segmentStartedAt) / 1000)));
      setStatus(buffered >= Math.min(selectedSeconds, 4)
        ? `${buffered}s buffered · replay ready`
        : `Buffering ${buffered}s…`);
      if (replayButton) replayButton.disabled = finalizing || buffered < 3;
    };

    const buildRecorder = (stream: MediaStream) => {
      const mimeType = preferredMime();
      try {
        return mimeType
          ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900000, audioBitsPerSecond: 64000 })
          : new MediaRecorder(stream);
      } catch {
        return new MediaRecorder(stream);
      }
    };

    const startRecorder = (stream: MediaStream) => {
      if (recorder && recordingStream === stream && recorder.state !== "inactive") return;
      chunks = [];
      recordingStream = stream;
      recorder = buildRecorder(stream);
      segmentStartedAt = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setStatus("Replay buffer unavailable on this browser.");
        if (replayButton) replayButton.disabled = true;
      };
      recorder.start(1000);
      updateStatus();
    };

    const hardStop = () => {
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* ignore */ }
      }
      recorder = null;
      recordingStream = null;
      chunks = [];
      segmentStartedAt = 0;
      finalizing = false;
      updateStatus();
    };

    const findMatchId = () => {
      const input = document.querySelector<HTMLInputElement>(".watch-share input");
      if (!input?.value) return 0;
      try {
        const url = new URL(input.value, location.origin);
        return Number(url.searchParams.get("matchId") ?? 0);
      } catch { return 0; }
    };

    const finalizePlayableClip = async () => {
      const current = recorder;
      const stream = recordingStream;
      if (!current || !stream || current.state === "inactive") return null;
      finalizing = true;
      if (replayButton) replayButton.disabled = true;

      const started = segmentStartedAt;
      const result = await new Promise<{ blob: Blob; durationSec: number } | null>((resolve) => {
        const finish = () => {
          const type = current.mimeType || chunks[0]?.type || "video/webm";
          const blob = chunks.length ? new Blob(chunks, { type }) : null;
          const durationSec = Math.max(3, Math.min(20, Math.round((Date.now() - started) / 1000)));
          current.onstop = null;
          resolve(blob ? { blob, durationSec } : null);
        };
        current.onstop = finish;
        try {
          current.requestData();
          window.setTimeout(() => {
            try { current.stop(); } catch { finish(); }
          }, 120);
        } catch {
          try { current.stop(); } catch { finish(); }
        }
      });

      recorder = null;
      chunks = [];
      if (stream.getVideoTracks().some((track) => track.readyState === "live")) startRecorder(stream);
      finalizing = false;
      return result;
    };

    const triggerReplay = async () => {
      const matchId = findMatchId();
      if (!matchId || !recorder || recorder.state === "inactive") {
        setStatus("Replay is still buffering. Keep Live running for a few seconds.");
        return;
      }
      const buffered = Math.floor((Date.now() - segmentStartedAt) / 1000);
      if (buffered < 3) {
        setStatus("Keep Live running for at least 3 seconds before replay.");
        return;
      }

      setStatus("Finalizing a playable replay clip…");
      const finalized = await finalizePlayableClip();
      if (!finalized?.blob.size) {
        setStatus("Unable to create replay clip on this phone.");
        if (replayButton) replayButton.disabled = false;
        return;
      }

      const actualDuration = Math.min(selectedSeconds, finalized.durationSec);
      const form = new FormData();
      form.set("matchId", String(matchId));
      form.set("durationSec", String(actualDuration));
      const handoff = new URLSearchParams(location.search).get("score_handoff");
      if (handoff) form.set("handoffToken", handoff);
      const type = finalized.blob.type || "video/webm";
      form.set("file", finalized.blob, type.includes("mp4") ? "replay.mp4" : "replay.webm");

      try {
        const response = await fetch("/api/live/replay", { method: "POST", body: form });
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to start replay");
        setStatus(`↻ REPLAY ON AIR · ${actualDuration}s · live feed continues in background`);
        window.setTimeout(updateStatus, actualDuration * 1000 + 1200);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Unable to start replay");
        if (replayButton) replayButton.disabled = false;
      }
    };

    const ensurePanel = () => {
      const controls = document.querySelector<HTMLElement>(".studio-controls");
      if (!controls) {
        panel?.remove(); panel = null; status = null; replayButton = null;
        return;
      }
      if (!panel || !document.body.contains(panel)) {
        panel = document.createElement("div");
        panel.className = "card instant-replay-card";
        panel.innerHTML = '<span>INSTANT REPLAY</span><h3>Replay the previous ball</h3><p>Core Cricket records a short complete camera + commentary segment on this broadcast phone so the replay stays playable on mobile viewers.</p><div class="replay-lengths"><button data-seconds="10" class="active">10 sec</button><button data-seconds="15">15 sec</button><button data-seconds="20">20 sec</button></div><button class="primary-button replay-now" disabled>↻ Replay</button><small class="replay-status">Start Live to build the replay buffer.</small>';
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
      const stream = video?.srcObject instanceof MediaStream ? video.srcObject : null;
      if (live && stream && stream.getVideoTracks().some((track) => track.readyState === "live")) startRecorder(stream);
      else if (!live && recorder) hardStop();
      updateStatus();
    };

    // Polling is intentional here. A MutationObserver created a self-triggering loop
    // when replay status text changed, which could freeze touch input in Live Studio.
    const timer = window.setInterval(ensurePanel, 500);
    ensurePanel();
    return () => {
      window.clearInterval(timer);
      hardStop();
      panel?.remove();
    };
  }, []);

  return null;
}

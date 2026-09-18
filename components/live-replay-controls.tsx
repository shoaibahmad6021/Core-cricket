"use client";

import { RefObject, useEffect, useRef, useState } from "react";

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

type CompletedSegment = { blob: Blob; durationSec: number };

export function LiveReplayControls({
  matchId,
  broadcasting,
  cameraOn,
  videoRef,
}: {
  matchId: number;
  broadcasting: boolean;
  cameraOn: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const [selectedSeconds, setSelectedSeconds] = useState(10);
  const [bufferedSeconds, setBufferedSeconds] = useState(0);
  const [status, setStatus] = useState("Start Live to build the replay buffer.");
  const [busy, setBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const previousRef = useRef<CompletedSegment | null>(null);
  const finalizingRef = useRef(false);
  const mountedRef = useRef(true);

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

  const beginRecording = (stream: MediaStream) => {
    if (!mountedRef.current) return;
    const recorder = buildRecorder(stream);
    chunksRef.current = [];
    recorderRef.current = recorder;
    streamRef.current = stream;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      if (!mountedRef.current) return;
      setStatus("Replay buffer is unavailable on this browser.");
      setBusy(false);
    };
    recorder.start(1000);
  };

  const finishCurrent = async (restart: boolean): Promise<CompletedSegment | null> => {
    const recorder = recorderRef.current;
    const stream = streamRef.current;
    if (!recorder || recorder.state === "inactive" || finalizingRef.current) return null;

    finalizingRef.current = true;
    const startedAt = startedAtRef.current;

    const segment = await new Promise<CompletedSegment | null>((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        const type = recorder.mimeType || chunksRef.current[0]?.type || "video/webm";
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null;
        const durationSec = Math.max(1, Math.min(20, Math.round((Date.now() - startedAt) / 1000)));
        recorder.onstop = null;
        resolve(blob?.size ? { blob, durationSec } : null);
      };
      recorder.onstop = finish;
      try {
        recorder.requestData();
        window.setTimeout(() => {
          try { recorder.stop(); } catch { finish(); }
        }, 100);
      } catch {
        try { recorder.stop(); } catch { finish(); }
      }
    });

    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = 0;
    finalizingRef.current = false;

    if (segment) previousRef.current = segment;
    if (
      restart &&
      mountedRef.current &&
      broadcasting &&
      stream &&
      stream.getVideoTracks().some((track) => track.readyState === "live")
    ) {
      beginRecording(stream);
    }
    return segment;
  };

  useEffect(() => {
    mountedRef.current = true;
    if (!broadcasting || !cameraOn) {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch { /* ignore */ }
      }
      recorderRef.current = null;
      streamRef.current = null;
      chunksRef.current = [];
      startedAtRef.current = 0;
      previousRef.current = null;
      setBufferedSeconds(0);
      setBusy(false);
      setStatus("Start Live to build the replay buffer.");
      return;
    }

    let cancelled = false;
    const connect = () => {
      if (cancelled || recorderRef.current) return;
      const stream = videoRef.current?.srcObject instanceof MediaStream ? videoRef.current.srcObject : null;
      if (stream && stream.getVideoTracks().some((track) => track.readyState === "live")) {
        beginRecording(stream);
        setStatus("Building replay buffer…");
      }
    };

    connect();
    const connectTimer = window.setInterval(connect, 400);
    const statusTimer = window.setInterval(() => {
      const startedAt = startedAtRef.current;
      const seconds = startedAt ? Math.max(0, Math.min(20, Math.floor((Date.now() - startedAt) / 1000))) : 0;
      setBufferedSeconds(seconds);
      if (!busy && seconds >= 3) setStatus(`${seconds}s buffered · replay ready`);
      else if (!busy && recorderRef.current) setStatus(`Buffering ${seconds}s…`);

      if (seconds >= 20 && recorderRef.current && !finalizingRef.current) {
        void finishCurrent(true);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(connectTimer);
      window.clearInterval(statusTimer);
    };
  }, [broadcasting, cameraOn, matchId, videoRef, busy]);

  useEffect(() => () => {
    mountedRef.current = false;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try { recorder.stop(); } catch { /* ignore */ }
    }
  }, []);

  const triggerReplay = async () => {
    if (!broadcasting || busy) return;
    setBusy(true);
    setStatus("Preparing instant replay…");

    try {
      const currentSeconds = startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : 0;
      let segment: CompletedSegment | null = null;

      if (currentSeconds >= 3 && recorderRef.current) {
        segment = await finishCurrent(true);
      } else {
        segment = previousRef.current;
      }

      if (!segment?.blob.size) {
        throw new Error("Replay is still buffering. Keep Live running for a few seconds.");
      }

      const actualDuration = Math.max(3, Math.min(selectedSeconds, segment.durationSec));
      const form = new FormData();
      form.set("matchId", String(matchId));
      form.set("durationSec", String(actualDuration));
      const handoff = new URLSearchParams(location.search).get("score_handoff");
      if (handoff) form.set("handoffToken", handoff);
      const type = segment.blob.type || "video/webm";
      form.set("file", segment.blob, type.includes("mp4") ? "replay.mp4" : "replay.webm");

      const response = await fetch("/api/live/replay", { method: "POST", body: form });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to start replay");

      setStatus(`↻ REPLAY ON AIR · last ${actualDuration}s · live continues underneath`);
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        setBusy(false);
      }, actualDuration * 1000 + 700);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start replay");
      setBusy(false);
    }
  };

  const ready = broadcasting && cameraOn && (bufferedSeconds >= 3 || Boolean(previousRef.current));

  return (
    <div className="card instant-replay-card">
      <span>INSTANT REPLAY</span>
      <h3>Replay the previous ball</h3>
      <p>Camera and commentary stay live while viewers see the selected recent replay.</p>
      <div className="replay-lengths">
        {[10, 15, 20].map((seconds) => (
          <button
            key={seconds}
            type="button"
            className={selectedSeconds === seconds ? "active" : ""}
            onClick={() => setSelectedSeconds(seconds)}
            disabled={busy}
          >
            {seconds} sec
          </button>
        ))}
      </div>
      <button
        type="button"
        className="primary-button replay-now"
        disabled={!ready || busy}
        onClick={() => void triggerReplay()}
      >
        {busy ? "Preparing replay…" : "↻ Replay"}
      </button>
      <small className="replay-status">{status}</small>
    </div>
  );
}

"use client";

import { useEffect } from "react";

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function waitForIce(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", changed);
      resolve();
    };
    const changed = () => { if (pc.iceGatheringState === "complete") finish(); };
    const timeout = window.setTimeout(finish, 3000);
    pc.addEventListener("icegatheringstatechange", changed);
  });
}

async function viewerBridge(token: string) {
  const viewerId = crypto.randomUUID();
  const pc = new RTCPeerConnection(rtcConfig);
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  let remoteVideo: HTMLVideoElement | null = null;
  let audioPrompt: HTMLButtonElement | null = null;

  pc.ontrack = (event) => {
    const stream = event.streams[0] ?? new MediaStream([event.track]);
    if (!remoteVideo) {
      const host = document.querySelector(".viewer-video");
      if (!host) return;
      remoteVideo = document.createElement("video");
      remoteVideo.className = "rtc-live-video";
      remoteVideo.autoplay = true;
      remoteVideo.playsInline = true;
      remoteVideo.controls = true;
      remoteVideo.muted = false;
      host.prepend(remoteVideo);
    }
    const current = remoteVideo.srcObject instanceof MediaStream ? remoteVideo.srcObject : new MediaStream();
    if (!current.getTracks().some((track) => track.id === event.track.id)) current.addTrack(event.track);
    remoteVideo.srcObject = current;
    const waiting = document.querySelector<HTMLElement>(".camera-waiting");
    if (waiting) waiting.style.display = "none";
    void remoteVideo.play().catch(() => {
      if (audioPrompt || !remoteVideo?.parentElement) return;
      audioPrompt = document.createElement("button");
      audioPrompt.className = "rtc-audio-prompt";
      audioPrompt.textContent = "Tap to hear live commentary";
      audioPrompt.onclick = () => { if (remoteVideo) { remoteVideo.muted = false; void remoteVideo.play(); } audioPrompt?.remove(); audioPrompt = null; };
      remoteVideo.parentElement.append(audioPrompt);
    });
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIce(pc);
  const offerSdp = pc.localDescription?.sdp;
  if (!offerSdp) throw new Error("Unable to create live viewer connection");
  await fetch("/api/live/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "offer", token, viewerId, sdp: offerSdp }) });

  let stopped = false;
  const poll = async () => {
    if (stopped || pc.remoteDescription) return;
    try {
      const response = await fetch(`/api/live/rtc?token=${encodeURIComponent(token)}&viewerId=${encodeURIComponent(viewerId)}`, { cache: "no-store" });
      const body = await response.json() as { answerSdp?: string | null };
      if (body.answerSdp && !pc.remoteDescription) await pc.setRemoteDescription({ type: "answer", sdp: body.answerSdp });
    } catch { /* keep JPEG fallback alive */ }
  };
  const timer = window.setInterval(() => void poll(), 900);
  void poll();

  return () => {
    stopped = true;
    window.clearInterval(timer);
    pc.close();
    remoteVideo?.remove();
    audioPrompt?.remove();
    void fetch("/api/live/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "close", token, viewerId }), keepalive: true });
  };
}

function publisherBridge() {
  const peers = new Map<string, RTCPeerConnection>();
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    const watchInput = document.querySelector<HTMLInputElement>(".watch-share input");
    const cameraVideo = document.querySelector<HTMLVideoElement>(".camera-stage video");
    const stream = cameraVideo?.srcObject instanceof MediaStream ? cameraVideo.srcObject : null;
    if (!watchInput?.value || !stream || stream.getVideoTracks().length === 0) return;
    const token = new URL(watchInput.value).searchParams.get("token");
    if (!token) return;
    try {
      const response = await fetch(`/api/live/rtc?token=${encodeURIComponent(token)}&publisher=1`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json() as { peers?: { viewerId: string; offerSdp: string }[] };
      for (const request of body.peers ?? []) {
        if (peers.has(request.viewerId)) continue;
        const pc = new RTCPeerConnection(rtcConfig);
        peers.set(request.viewerId, pc);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
            window.setTimeout(() => { pc.close(); peers.delete(request.viewerId); }, 2500);
          }
        };
        try {
          await pc.setRemoteDescription({ type: "offer", sdp: request.offerSdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIce(pc);
          const answerSdp = pc.localDescription?.sdp;
          if (!answerSdp) throw new Error("No live answer");
          await fetch("/api/live/rtc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "answer", token, viewerId: request.viewerId, sdp: answerSdp }) });
        } catch {
          pc.close();
          peers.delete(request.viewerId);
        }
      }
    } catch { /* snapshot broadcast remains available */ }
  };

  const timer = window.setInterval(() => void tick(), 850);
  void tick();
  return () => { stopped = true; window.clearInterval(timer); peers.forEach((pc) => pc.close()); peers.clear(); };
}

export function LiveRtcBridge() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    if (location.pathname === "/watch") {
      const token = new URLSearchParams(location.search).get("token") ?? "";
      if (token) void viewerBridge(token).then((fn) => { if (cancelled) fn(); else cleanup = fn; }).catch(() => undefined);
    } else {
      cleanup = publisherBridge();
    }
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return null;
}

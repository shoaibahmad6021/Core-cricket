"use client";

import { useEffect, useState } from "react";

type Destination = {
  id: "core" | "youtube" | "facebook";
  label: string;
  configured: boolean;
  connected: boolean;
  detail: string;
};

type DestinationResponse = {
  destinations: Destination[];
  relayReady: boolean;
};

export function BroadcastDestinations({ broadcasting }: { broadcasting: boolean }) {
  const [data, setData] = useState<DestinationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/live/destinations", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as DestinationResponse;
        if (!cancelled) setData(next);
      } catch { /* Destination status is non-critical to Core Cricket Live. */ }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const destinations = data?.destinations ?? [
    { id: "core" as const, label: "Core Cricket", configured: true, connected: true, detail: "Built-in viewer" },
    { id: "youtube" as const, label: "YouTube Live", configured: false, connected: false, detail: "Channel connection required" },
    { id: "facebook" as const, label: "Facebook Live", configured: false, connected: false, detail: "Page/channel connection required" },
  ];

  return <section className="card multistream-card">
    <div className="multistream-heading">
      <div><span>BROADCAST DESTINATIONS</span><h3>Send this match to multiple channels</h3></div>
      <small>{broadcasting ? "Core Cricket is live" : "Start Core Cricket Live first"}</small>
    </div>
    <div className="destination-grid">
      {destinations.map((destination) => <article key={destination.id} className={`destination-row destination-${destination.id}`}>
        <div className="destination-mark">{destination.id === "youtube" ? "▶" : destination.id === "facebook" ? "f" : "CC"}</div>
        <div className="destination-copy"><b>{destination.label}</b><span>{destination.detail}</span></div>
        <div className={`destination-status ${destination.configured ? "ready" : "setup"}`}>
          <i /> {destination.id === "core" ? (broadcasting ? "LIVE" : "READY") : destination.configured ? "CONNECTED" : "SETUP REQUIRED"}
        </div>
      </article>)}
    </div>
    <p className="multistream-note">YouTube and Facebook will use a server-side relay so stream keys stay private and the same Core Cricket score/sponsor graphics can be sent to every destination.</p>
  </section>;
}

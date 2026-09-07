"use client";

import { useEffect } from "react";

export function StableLiveWatchLink() {
  useEffect(() => {
    let cancelled = false;
    let lastToken = "";
    let stableLink = "";

    const sync = async () => {
      const share = document.querySelector<HTMLElement>(".watch-share");
      const input = share?.querySelector<HTMLInputElement>("input");
      if (!share || !input?.value) return;
      let parsed: URL;
      try { parsed = new URL(input.value); } catch { return; }
      const token = parsed.searchParams.get("token") ?? "";
      const matchIdAlready = parsed.searchParams.get("matchId") ?? "";
      if (matchIdAlready) {
        stableLink = input.value;
      } else if (token && token !== lastToken) {
        lastToken = token;
        try {
          const response = await fetch(`/api/live?token=${encodeURIComponent(token)}`, { cache: "no-store" });
          const body = await response.json() as { match?: { id?: number } };
          const matchId = body.match?.id;
          if (!response.ok || !matchId || cancelled) return;
          stableLink = `${location.origin}/watch?matchId=${matchId}`;
          input.value = stableLink;
          input.setAttribute("value", stableLink);
          const whatsapp = share.querySelector<HTMLAnchorElement>('a[href*="wa.me"]');
          if (whatsapp) whatsapp.href = `https://wa.me/?text=${encodeURIComponent(`Watch this match live on Core Cricket: ${stableLink}`)}`;
          input.dispatchEvent(new Event("change", { bubbles: true }));
          document.body.setAttribute("data-core-live-watch-link", stableLink);
        } catch { /* keep session link if lookup is temporarily unavailable */ }
      }

      if (stableLink) {
        const copy = share.querySelector<HTMLButtonElement>("button");
        if (copy && copy.dataset.stableLiveCopy !== "1") {
          copy.dataset.stableLiveCopy = "1";
          copy.addEventListener("click", (event) => {
            if (!stableLink) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            void navigator.clipboard.writeText(stableLink);
          }, true);
        }
      }
    };

    const timer = window.setInterval(() => void sync(), 700);
    void sync();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return null;
}

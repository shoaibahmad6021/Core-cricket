"use client";

import { useEffect } from "react";
import QRCode from "qrcode";

export function LiveWatchQrEnhancer() {
  useEffect(() => {
    let generation = 0;

    const syncQr = () => {
      const share = document.querySelector<HTMLElement>(".watch-share");
      const input = share?.querySelector<HTMLInputElement>("input");
      const link = input?.value?.trim();
      if (!share || !link) return;

      let panel = share.parentElement?.querySelector<HTMLElement>(".live-watch-qr");
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "live-watch-qr";
        panel.innerHTML = '<span>SCAN TO WATCH LIVE</span><img alt="QR code to watch this Core Cricket live match" /><small>Open your phone camera and scan this code to watch the live stream.</small>';
        share.insertAdjacentElement("afterend", panel);
      }

      if (panel.dataset.link === link) return;
      panel.dataset.link = link;
      const current = ++generation;
      void QRCode.toDataURL(link, {
        width: 240,
        margin: 1,
        color: { dark: "#14281c", light: "#ffffff" },
      }).then((dataUrl) => {
        if (current !== generation || panel?.dataset.link !== link) return;
        const image = panel.querySelector<HTMLImageElement>("img");
        if (image) image.src = dataUrl;
      }).catch(() => undefined);
    };

    syncQr();
    const observer = new MutationObserver(syncQr);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  return null;
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storage-live.css";
import "./lineup.css";
import "./toss.css";
import "./launch-cinematic.css";
import "./stylish-logo.css";
import "./launch-duration.css";
import "./logo-pieces-animation.css";
import "./uploaded-crest-animation.css";
import "./letters-ball-animation.css";
import "./letters-ball-keyframes-fix.css";
import "./letters-ball-paths.css";
import "./live-camera.css";
import "./scoring-transfer.css";
import "./gta-falcons-splash.css";
import "./cinematic-v2.css";
import "./regular-colorful.css";
import "./startup-impact-final.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://core-cricket.vercel.app"),
  title: "Core Cricket | Live scoring and player stats",
  description: "Score community cricket ball by ball, manage teams and tournaments, track every player, and open Live Studio from one installable app.",
  applicationName: "Core Cricket",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Core Cricket" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Core Cricket",
    description: "Score every ball. Own every stat.",
    type: "website",
    url: "/",
    images: [{ url: "/core-cricket-app-icon-512.png", width: 512, height: 512, alt: "Core Cricket — Score every ball. Own every stat." }],
  },
  twitter: { card: "summary", title: "Core Cricket", description: "Score every ball. Own every stat.", images: ["/core-cricket-app-icon-512.png"] },
  icons: {
    icon: [{ url: "/core-cricket-app-icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/core-cricket-app-icon-512.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/core-cricket-app-icon-192.png",
    apple: [{ url: "/core-cricket-app-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#13231d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

export const dynamic = "force-dynamic";

export async function GET() {
  const youtubeConfigured = Boolean(process.env.YOUTUBE_STREAM_URL && process.env.YOUTUBE_STREAM_KEY);
  const facebookConfigured = Boolean(process.env.FACEBOOK_STREAM_URL && process.env.FACEBOOK_STREAM_KEY);
  const relayReady = Boolean(process.env.MULTISTREAM_RELAY_URL && process.env.MULTISTREAM_RELAY_TOKEN);

  return Response.json({
    relayReady,
    destinations: [
      { id: "core", label: "Core Cricket", configured: true, connected: true, detail: "Built-in viewer" },
      { id: "youtube", label: "YouTube Live", configured: youtubeConfigured, connected: youtubeConfigured && relayReady, detail: youtubeConfigured ? (relayReady ? "Ready for relay" : "Channel configured · relay required") : "Channel connection required" },
      { id: "facebook", label: "Facebook Live", configured: facebookConfigured, connected: facebookConfigured && relayReady, detail: facebookConfigured ? (relayReady ? "Ready for relay" : "Channel configured · relay required") : "Page/channel connection required" },
    ],
  });
}

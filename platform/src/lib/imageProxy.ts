// Instagram/TikTok/etc CDN URLs block hotlinking. Route through an image proxy.
export function proxyImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    // weserv requires hostname+path without protocol
    const target = `${u.host}${u.pathname}${u.search}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(target)}`;
  } catch {
    return url;
  }
}

// Instagram/TikTok/etc CDN URLs block hotlinking. Route through an image proxy.
export function proxyImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    // Só faz sentido (e é seguro) proxiar http(s); data:/blob:/javascript: etc. são descartados.
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    // weserv requires hostname+path without protocol; "ssl:" makes it fetch the origin over TLS.
    const target = `${u.protocol === "https:" ? "ssl:" : ""}${u.host}${u.pathname}${u.search}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(target)}`;
  } catch {
    return undefined;
  }
}

export default async function handler(req, res) {
  const incomingHostRaw =
    req.headers["x-forwarded-host"] ||
    req.headers["x-vercel-forwarded-host"] ||
    req.headers["host"] ||
    "";

  const incomingHost = String(incomingHostRaw)
    .split(",")[0]
    .toLowerCase();

  const subdomain = incomingHost.endsWith(".metabusy.com.br")
    ? incomingHost.split(".")[0]
    : "";

  const pathname = req.url || "/";

  try {
    // assets
    if (
      pathname.startsWith("/assets/") ||
      pathname.endsWith(".js") ||
      pathname.endsWith(".css") ||
      pathname.endsWith(".svg") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg") ||
      pathname.endsWith(".woff2") ||
      pathname.endsWith(".ico") ||
      pathname.endsWith(".json") ||
      pathname.endsWith(".webmanifest")
    ) {
      const assetUrl = https://metabusy.lovable.app${pathname};

      const assetResponse = await fetch(assetUrl);

      const contentType =
        assetResponse.headers.get("content-type") ||
        "application/octet-stream";

      const body = await assetResponse.arrayBuffer();

      res.setHeader("Content-Type", contentType);

      res.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );

      return res
        .status(assetResponse.status)
        .send(Buffer.from(body));
    }

    // html
    const url = new URL(
      "https://rhnijvtwnpmdyftfyoyiq.supabase.co/functions/v1/site-render"
    );

    if (subdomain) {
      url.searchParams.set("subdomain", subdomain);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "x-forwarded-host": incomingHost,
        "x-original-host": incomingHost,
      },
    });

    const html = await response.text();

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    res.setHeader("Cache-Control", "no-cache");

    return res.status(response.status).send(html);
  } catch (error) {
    console.error(error);

    return res.status(500).send("Proxy error");
  }
}

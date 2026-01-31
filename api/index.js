export default async function handler(req, res) {
  const incomingHostRaw =
    req.headers["x-forwarded-host"] ||
    req.headers["x-vercel-forwarded-host"] ||
    req.headers["host"] ||
    "";

  const incomingHost = String(incomingHostRaw).split(":")[0].toLowerCase();

  // Extrai o subdomínio: site1.metabusy.com.br -> site1
  const subdomain = incomingHost.endsWith(".metabusy.com.br")
    ? incomingHost.replace(".metabusy.com.br", "")
    : "";

  const url = new URL("https://rhnytpnmdytftxoyiq.supabase.co/functions/v1/site-render");

  if (subdomain) {
    url.searchParams.set("subdomain", subdomain);
  }

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "text/html",
        "x-forwarded-host": incomingHost,
        "x-original-host": incomingHost,
      },
    });

    const html = await response.text();

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.status(response.status).send(html);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Proxy error");
  }
}

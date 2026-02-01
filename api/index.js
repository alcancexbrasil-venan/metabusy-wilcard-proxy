export default async function handler(req, res) {
  const incomingHostRaw =
    req.headers["x-forwarded-host"] ||
    req.headers["x-vercel-forwarded-host"] ||
    req.headers["host"] ||
    "";

  const incomingHost = String(incomingHostRaw).split(",")[0].toLowerCase();

  const subdomain = incomingHost.endsWith(".metabusy.com.br")
    ? incomingHost.split(".")[0]
    : "";

  // Parse the original request URL to get path and query params
  const originalUrl = new URL(req.url, `https://${incomingHost}`);
  const pathname = originalUrl.pathname;

  const url = new URL("https://rhniytwnpmdytftyoyiq.supabase.co/functions/v1/site-render");
  
  if (subdomain) url.searchParams.set("subdomain", subdomain);
  
  // Forward all original query parameters
  for (const [key, value] of originalUrl.searchParams) {
    if (key !== "subdomain") {
      url.searchParams.set(key, value);
    }
  }
  
  // Forward path as query param (for /privacy, /terms routes)
  if (pathname && pathname !== "/" && pathname !== "") {
    url.searchParams.set("path", pathname);
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
    res.status(500).send("Proxy error");
  }
}

export default async function handler(req, res) {
  try {
    // Host real (sem porta)
    const incomingHostRaw =
      req.headers["x-forwarded-host"] ||
      req.headers["x-vercel-forwarded-host"] ||
      req.headers["host"] ||
      "";

    const incomingHost = String(incomingHostRaw).split(",")[0].trim().toLowerCase().split(":")[0];

    // Descobre subdomínio
    const baseDomain = ".metabusy.com.br";
    const subdomain = incomingHost.endsWith(baseDomain)
      ? incomingHost.slice(0, -baseDomain.length)
      : "";

    // URL do Supabase
    const target = new URL(
      "https://rhniytwnpmdytfyoyiq.supabase.co/functions/v1/site-render"
    );

    if (subdomain) target.searchParams.set("subdomain", subdomain);

    // ✅ Preserva query params a partir de req.url (mais confiável)
    const original = new URL(req.url, https://${incomingHost});
    for (const [k, v] of original.searchParams.entries()) {
      target.searchParams.set(k, v);
    }

    const response = await fetch(target.toString(), {
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
  } catch (err) {
    // ✅ Importante: mostrar o erro nos logs da Vercel
    console.error("Proxy error:", err);
    res.status(500).send("Proxy error");
  }
}

export default async function handler(req, res) {
  try {
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      "";

    const cleanHost = host.split(",")[0].trim().split(":")[0].toLowerCase();

    const baseDomain = ".metabusy.com.br";
    let subdomain = "";

    if (cleanHost.endsWith(baseDomain)) {
      subdomain = cleanHost.replace(baseDomain, "");
    }

    let queryString = "";
    if (req.url.includes("?")) {
      queryString = req.url.substring(req.url.indexOf("?"));
    }

    let targetUrl = "https://rhniytwnpmdytfyoyiq.supabase.co/functions/v1/site-render";

    if (subdomain) {
      targetUrl += ?subdomain=${subdomain};
    }

    if (queryString) {
      if (targetUrl.includes("?")) {
        targetUrl += "&" + queryString.replace("?", "");
      } else {
        targetUrl += queryString;
      }
    }

    const response = await fetch(targetUrl);

    const html = await response.text();

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(response.status).send(html);

  } catch (err) {
    console.error("Proxy crash:", err);
    res.status(500).send("Proxy error");
  }
}

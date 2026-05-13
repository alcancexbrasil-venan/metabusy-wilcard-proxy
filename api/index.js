const STATIC_ASSET_PATTERN = /^(\/assets\/|\/icons\/|\/favicon\.ico$|\/manifest(?:\.json|\.webmanifest)?$|.*\.(?:js|mjs|css|svg|woff|woff2|png|jpg|jpeg|webp|json|map|wasm|ico)$)/i;

export default async function handler(req, res) {
  const incomingHostRaw =
    req.headers["x-forwarded-host"] ||
    req.headers["x-vercel-forwarded-host"] ||
    req.headers["host"] ||
    "";

  const incomingHost = String(incomingHostRaw).split(",")[0].toLowerCase();

  const requestUrl = new URL(
    req.url || "/",
    `https://${incomingHost || "metabusy.com.br"}`
  );

  const pathname = requestUrl.pathname;

  const subdomain = incomingHost.endsWith(".metabusy.com.br")
    ? incomingHost.split(".")[0]
    : "";

  const target = new URL(
    "https://rhniytwnpmdytftyoyiq.supabase.co/functions/v1/site-render"
  );

  if (subdomain) {
    target.searchParams.set("subdomain", subdomain);
  }

  target.searchParams.set("path", pathname);

  requestUrl.searchParams.forEach((value, key) => {
    if (key !== "subdomain" && key !== "path") {
      target.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(target.toString(), {
      method: req.method,
      headers: {
        accept:
          req.headers["accept"] ||
          (STATIC_ASSET_PATTERN.test(pathname)
            ? "*/*"
            : "text/html"),

        "accept-language":
          req.headers["accept-language"] || "",

        "user-agent":
          req.headers["user-agent"] || "",

        "x-forwarded-host": incomingHost,
        "x-original-host": incomingHost,
      },

      redirect: "follow",
    });

    const blockedHeaders = new Set([
      "connection",
      "content-encoding",
      "content-length",
      "transfer-encoding",
      "set-cookie",
    ]);

    response.headers.forEach((value, key) => {
      if (!blockedHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ||
        "application/octet-stream"
    );

    if (STATIC_ASSET_PATTERN.test(pathname)) {
      res.setHeader("X-Asset-Bypass", "vercel-proxy");
    }

    const body = Buffer.from(
      await response.arrayBuffer()
    );

    res.status(response.status).send(body);

  } catch (error) {

    console.error("Proxy error", error);

    res
      .status(500)
      .setHeader(
        "Content-Type",
        "text/plain; charset=utf-8"
      )
      .send("Proxy error");
  }
}

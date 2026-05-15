const SUPABASE_FUNCTION_URL = "https://rhniytwnpmdytftyoyiq.supabase.co/functions/v1/site-render";
const ROOT_DOMAIN = "metabusy.com.br";
const PANEL_ORIGIN = "https://metabusy.lovable.app";

const STATIC_ASSET_PATTERN = /^(?:\/assets\/|\/icons\/|\/favicon\.ico$|\/manifest(?:\.json|\.webmanifest)?$|.*\.(?:js|mjs|css|svg|woff|woff2|ttf|otf|eot|png|jpg|jpeg|webp|gif|avif|json|map|wasm|ico)$)/i;

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "").split(",")[0].trim();
}

function getOriginalHost(req) {
  return firstHeaderValue(
    req.headers["x-forwarded-host"] ||
      req.headers["x-vercel-forwarded-host"] ||
      req.headers["x-original-host"] ||
      req.headers.host ||
      ROOT_DOMAIN,
  ).toLowerCase();
}

function getRequestUrl(req, host) {
  const absoluteUrl = req.url && /^https?:\/\//i.test(req.url)
    ? req.url
    : `https://${host || ROOT_DOMAIN}${req.url || "/"}`;

  const parsed = new URL(absoluteUrl);

  const rewritePath = parsed.searchParams.get("__path");

  if (rewritePath !== null) {
    const normalizedPath = rewritePath
      ? `/${rewritePath.replace(/^\/+/, "")}`
      : "/";

    parsed.pathname = normalizedPath;
    parsed.searchParams.delete("__path");
  }

  return parsed;
}

function resolveSubdomain(host) {
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return "";

  const candidate = host
    .slice(0, -(`.${ROOT_DOMAIN}`).length)
    .split(".")[0];

  if (!candidate || candidate === "www") return "";

  return candidate;
}

function copySafeResponseHeaders(response, res) {
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });
}

function fallbackContentType(pathname) {
  const ext = (
    pathname.match(/\.([a-z0-9]+)$/i)?.[1] || ""
  ).toLowerCase();

  const map = {
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    map: "application/json; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
    wasm: "application/wasm",
  };

  return map[ext] || "application/octet-stream";
}

async function proxyStaticAsset(requestUrl, req, res) {
  const upstream = new URL(requestUrl.pathname, PANEL_ORIGIN);

  requestUrl.searchParams.forEach((value, key) =>
    upstream.searchParams.append(key, value)
  );

  const response = await fetch(upstream.toString(), {
    method: "GET",
    headers: {
      accept: firstHeaderValue(req.headers.accept) || "*/*",
      "accept-language": firstHeaderValue(req.headers["accept-language"]),
      "user-agent": firstHeaderValue(req.headers["user-agent"]),
    },
    redirect: "follow",
  });

  copySafeResponseHeaders(response, res);

  const contentType =
    response.headers.get("content-type") ||
    fallbackContentType(requestUrl.pathname);

  res.setHeader("Content-Type", contentType);

  res.setHeader("X-Asset-Bypass", "vercel-direct-lovable");

  const body = Buffer.from(await response.arrayBuffer());

  return res.status(response.status).send(body);
}

async function proxyEdgeFunction(requestUrl, originalHost, req, res) {
  const target = new URL(SUPABASE_FUNCTION_URL);

  const subdomain = resolveSubdomain(originalHost);

  if (subdomain) {
    target.searchParams.set("subdomain", subdomain);
  }

  target.searchParams.set("path", requestUrl.pathname || "/");

  requestUrl.searchParams.forEach((value, key) => {
    if (key !== "path" && key !== "subdomain") {
      target.searchParams.append(key, value);
    }
  });

  const response = await fetch(target.toString(), {
    method: req.method,
    headers: {
      accept:
        firstHeaderValue(req.headers.accept) ||
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

      "accept-language": firstHeaderValue(
        req.headers["accept-language"]
      ),

      "user-agent": firstHeaderValue(
        req.headers["user-agent"]
      ),

      "x-forwarded-host": originalHost,
      "x-original-host": originalHost,
      "x-vercel-forwarded-host": originalHost,
      "x-forwarded-proto": "https",
      "x-original-pathname": requestUrl.pathname || "/",

      forwarded: `proto=https;host=${originalHost}`,
    },

    redirect: "follow",
  });

  copySafeResponseHeaders(response, res);

  res.setHeader(
    "Content-Type",
    response.headers.get("content-type") ||
      "text/html; charset=utf-8"
  );

  res.setHeader("X-Proxied-By", "metabusy-vercel-proxy");

  res.setHeader(
    "X-Forwarded-Host-Applied",
    originalHost
  );

  const body = Buffer.from(await response.arrayBuffer());

  return res.status(response.status).send(body);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,POST,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization,content-type,apikey,x-client-info"
    );

    return res.status(204).end();
  }

  try {
    const originalHost = getOriginalHost(req);

    const requestUrl = getRequestUrl(req, originalHost);

    const pathname = requestUrl.pathname || "/";

    if (STATIC_ASSET_PATTERN.test(pathname)) {
      return await proxyStaticAsset(requestUrl, req, res);
    }

    return await proxyEdgeFunction(
      requestUrl,
      originalHost,
      req,
      res
    );

  } catch (error) {

    console.error("MetaBusy proxy error", error);

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8"
    );

    return res.status(502).send("Proxy error");
  }
}

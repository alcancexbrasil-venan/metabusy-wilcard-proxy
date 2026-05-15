export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://rhniytwnpmdytftyoyiq.supabase.co/functions/v1/site-render"
    );

    const html = await response.text();

    res.setHeader("Content-Type", "text/html; charset=utf-8");

    return res.status(200).send(html);

  } catch (error) {

    console.error(error);

    return res.status(500).send("Proxy error");
  }
}

export async function onRequest(context) {
  const netlifyBase = context.env.NETLIFY_API_BASE;

  if (!netlifyBase) {
    return new Response(
      JSON.stringify({ error: "NETLIFY_API_BASE environment variable is not set in Cloudflare Pages settings" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(context.request.url);
  const targetUrl = netlifyBase.replace(/\/$/, "") + url.pathname + url.search;

  return fetch(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: ["GET", "HEAD"].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: "follow",
  });
}

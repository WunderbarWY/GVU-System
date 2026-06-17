import "@supabase/functions-js/edge-runtime.d.ts";

const LINEAR_ENDPOINT = "https://api.linear.app/graphql";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, X-Linear-Key",
};

function getApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    return auth.replace(/^Bearer\s+/i, "").trim();
  }
  return req.headers.get("x-api-key") || req.headers.get("x-linear-key");
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const apiKey = getApiKey(req);
    if (!apiKey) {
      return Response.json(
        { error: "Missing Linear API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    try {
      const body = await req.json();
      const response = await fetch(LINEAR_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Debug 401 from Linear
      if (response.status === 401) {
        return Response.json(
          {
            ...data,
            _proxyDebug: {
              keyPrefix: apiKey.slice(0, 10),
              keyLength: apiKey.length,
              authHeader: apiKey.startsWith("lin_api_") || apiKey.startsWith("user_api_")
                ? "raw key"
                : "unknown format",
            },
          },
          { status: response.status, headers: corsHeaders }
        );
      }

      return Response.json(data, { status: response.status, headers: corsHeaders });
    } catch (err: any) {
      return Response.json(
        { error: err?.message || String(err) },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

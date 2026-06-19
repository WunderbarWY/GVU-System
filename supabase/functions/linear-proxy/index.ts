import "@supabase/functions-js/edge-runtime.d.ts";

const LINEAR_ENDPOINT = "https://api.linear.app/graphql";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Api-Key, X-Linear-Key",
};

function getApiKey(req: Request): string | null {
  const key = req.headers.get("x-linear-key") || req.headers.get("x-api-key");
  return key?.trim() || null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === "GET") {
    return Response.json(
      { ok: true, service: "linear-proxy", expectedHeader: "X-Linear-Key" },
      { status: 200, headers: corsHeaders }
    );
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    return Response.json(
      { error: "Missing Linear API key. Send it as X-Linear-Key." },
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

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: "Linear returned non-JSON response", body: text.slice(0, 500) };
    }

    if (response.status === 401 || response.status === 403) {
      return Response.json(
        {
          ...(typeof data === "object" && data !== null ? data : { error: data }),
          _proxyDebug: {
            keyPrefix: apiKey.slice(0, 10),
            keyLength: apiKey.length,
            keyFormat: apiKey.startsWith("lin_api_") || apiKey.startsWith("user_api_")
              ? "linear-api-key"
              : "unexpected-format",
          },
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    return Response.json(data, { status: response.status, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: message },
      { status: 500, headers: corsHeaders }
    );
  }
});

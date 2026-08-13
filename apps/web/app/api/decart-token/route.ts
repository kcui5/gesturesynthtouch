import { createDecartClient } from "@decartai/sdk"

// Mints a short-lived Decart client token so the real API key never reaches
// the browser. The client fetches a fresh token per realtime connection.
export async function POST(request: Request) {
  const apiKey = process.env.DECART_API_KEY
  if (!apiKey) {
    return Response.json({ error: "AI effect not configured" }, { status: 503 })
  }

  try {
    const client = createDecartClient({ apiKey })
    const origin = request.headers.get("origin")
    const token = await client.tokens.create({
      expiresIn: 300,
      allowedModels: ["lucy-2.5"],
      ...(origin ? { allowedOrigins: [origin] } : {}),
    })
    return Response.json({ apiKey: token.apiKey, expiresAt: token.expiresAt })
  } catch (err) {
    console.error("Decart token creation failed:", err)
    return Response.json({ error: "token creation failed" }, { status: 502 })
  }
}

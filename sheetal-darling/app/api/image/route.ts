import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const key = process.env.OPENAI_API_KEY;
    if (!key || !prompt) {
      return NextResponse.json({ demo: true });
    }
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
        prompt: String(prompt).slice(0, 1000),
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (resp.ok) {
      const data = await resp.json();
      const b64: string | undefined = data.data?.[0]?.b64_json;
      if (b64) return NextResponse.json({ image: `data:image/png;base64,${b64}` });
    }
    return NextResponse.json({ demo: true });
  } catch {
    return NextResponse.json({ demo: true });
  }
}

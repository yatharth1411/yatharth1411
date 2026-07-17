import { NextRequest, NextResponse } from "next/server";
import { systemPrompt } from "@/lib/persona";
import { brainReply } from "@/lib/localBrain";
import type { LangMode, MemoryProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMsg {
  role: string;
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: InMsg[] = Array.isArray(body.messages) ? body.messages.slice(-14) : [];
    const lang: LangMode = ["en", "hi", "hinglish"].includes(body.lang) ? body.lang : "hinglish";
    const memory: MemoryProfile | null = body.memory ?? null;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    const key = process.env.OPENAI_API_KEY;
    if (key && lastUser) {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt(lang, memory) },
              ...messages.map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: String(m.content).slice(0, 4000),
              })),
            ],
            temperature: 0.8,
            max_tokens: 600,
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (resp.ok) {
          const data = await resp.json();
          const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
          if (text) return NextResponse.json({ text, source: "openai" });
        }
      } catch {
        /* fall through to local brain */
      }
    }

    const text = brainReply(lastUser?.content ?? "", { lang, memory, now: new Date() });
    return NextResponse.json({ text, source: "local" });
  } catch {
    return NextResponse.json({
      text: "Sorry jaan, ek chhota sa hiccup ho gaya. Ek baar phir try karo? 💫",
      source: "error",
    });
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK = [
  { title: "AI assistants get warmer, more personal in 2026", url: "https://news.ycombinator.com", by: "sheetal", score: 512 },
  { title: "The quiet rise of privacy-first local-first apps", url: "https://news.ycombinator.com", by: "sheetal", score: 430 },
  { title: "Why Hinglish is the internet's fastest-growing language", url: "https://news.ycombinator.com", by: "sheetal", score: 388 },
  { title: "Small habits, big results: the science of consistency", url: "https://news.ycombinator.com", by: "sheetal", score: 301 },
  { title: "Open-source LLMs keep closing the gap", url: "https://news.ycombinator.com", by: "sheetal", score: 276 },
];

export async function GET() {
  try {
    const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!topRes.ok) throw new Error("hn failed");
    const ids: number[] = (await topRes.json()).slice(0, 8);
    const items = await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) return null;
        const it = await r.json();
        if (!it?.title) return null;
        return {
          title: it.title as string,
          url: (it.url as string) ?? `https://news.ycombinator.com/item?id=${id}`,
          by: (it.by as string) ?? "",
          score: (it.score as number) ?? 0,
        };
      })
    );
    const clean = items.filter(Boolean);
    if (clean.length) {
      return NextResponse.json({ items: clean, source: "hackernews", demo: false });
    }
    throw new Error("empty");
  } catch {
    return NextResponse.json({ items: FALLBACK, source: "demo", demo: true });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ heading: "", abstract: "", related: [] });

  try {
    const resp = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(12000), headers: { "User-Agent": "SheetalDarling/1.0" } }
    );
    if (resp.ok) {
      const d = await resp.json();
      const related: { text: string; url: string }[] = [];
      for (const r of d.RelatedTopics ?? []) {
        if (r.Text && related.length < 4) related.push({ text: r.Text, url: r.FirstURL });
        if (Array.isArray(r.Topics)) {
          for (const t of r.Topics) {
            if (t.Text && related.length < 4) related.push({ text: t.Text, url: t.FirstURL });
          }
        }
      }
      return NextResponse.json({
        heading: d.Heading ?? "",
        abstract: d.AbstractText ?? "",
        source: d.AbstractSource ?? "",
        url: d.AbstractURL ?? "",
        related,
      });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({ heading: "", abstract: "", related: [] });
}

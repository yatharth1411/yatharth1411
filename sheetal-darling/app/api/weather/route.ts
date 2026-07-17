import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONDITIONS = [
  { desc: "clear sky", icon: "☀️" },
  { desc: "few clouds", icon: "🌤️" },
  { desc: "scattered clouds", icon: "⛅" },
  { desc: "light breeze", icon: "🍃" },
  { desc: "pleasant sunshine", icon: "🌞" },
  { desc: "light haze", icon: "🌫️" },
];

function seededDemo(city: string) {
  let h = 0;
  for (let i = 0; i < city.length; i++) h = (Math.imul(31, h) + city.charCodeAt(i)) | 0;
  const r = Math.abs(h);
  const cond = CONDITIONS[r % CONDITIONS.length];
  const temp = 21 + (r % 150) / 10; // 21–36 °C
  return {
    city,
    temp,
    feels: temp - 1.5 + ((r >> 3) % 30) / 10,
    desc: cond.desc,
    icon: cond.icon,
    humidity: 30 + ((r >> 5) % 55),
    wind: 4 + ((r >> 7) % 22),
    demo: true,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get("city") || "Delhi").trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const key = process.env.OPENWEATHER_API_KEY;

  if (key) {
    try {
      const q = lat && lon ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city)}`;
      const resp = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${q}&appid=${key}&units=metric`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (resp.ok) {
        const w = await resp.json();
        return NextResponse.json({
          city: w.name ?? city,
          temp: w.main?.temp ?? 0,
          feels: w.main?.feels_like ?? 0,
          desc: w.weather?.[0]?.description ?? "",
          icon: "🌤️",
          humidity: w.main?.humidity ?? 0,
          wind: Math.round((w.wind?.speed ?? 0) * 3.6),
          demo: false,
        });
      }
    } catch {
      /* fall through to demo */
    }
  }

  return NextResponse.json(seededDemo(city.charAt(0).toUpperCase() + city.slice(1)));
}

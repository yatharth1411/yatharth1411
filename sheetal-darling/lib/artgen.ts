"use client";

/**
 * Procedural "dream art" generator — used as a beautiful offline fallback
 * when no image-model API key is configured. Deterministic per prompt.
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES: string[][] = [
  ["#2b1055", "#7597de", "#ec4899", "#a855f7", "#38bdf8"],
  ["#0f0c29", "#302b63", "#24243e", "#ff6ec4", "#7873f5"],
  ["#141e30", "#243b55", "#8e2de2", "#4a00e0", "#ff8bd1"],
  ["#20002c", "#6a3093", "#a044ff", "#ff5e9c", "#59c2ff"],
  ["#1a0533", "#5f0a87", "#a4508b", "#ff7ab8", "#7bdff2"],
];

export function generateArt(prompt: string, size = 768): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rnd = mulberry32(hash(prompt.toLowerCase().trim() || "sheetal"));
  const pal = PALETTES[Math.floor(rnd() * PALETTES.length)];

  // background
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, pal[0]);
  bg.addColorStop(0.55, pal[1]);
  bg.addColorStop(1, pal[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // aurora ribbons
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const yBase = rnd() * size;
    const amp = 40 + rnd() * 140;
    const col = pal[2 + Math.floor(rnd() * (pal.length - 2))];
    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, yBase + Math.sin(x / (60 + rnd() * 120) + i * 2) * amp * rnd());
    }
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2);
    g.addColorStop(0, col + "00");
    g.addColorStop(0.5, col + "55");
    g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.fill();
  }

  // glowing orbs
  for (let i = 0; i < 9; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 40 + rnd() * 220;
    const col = pal[Math.floor(rnd() * pal.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + "aa");
    g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // stars
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 140; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = rnd() * 1.6 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.75})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // moon / sun
  const mx = size * (0.2 + rnd() * 0.6);
  const my = size * (0.15 + rnd() * 0.35);
  const mr = size * (0.08 + rnd() * 0.08);
  const moon = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 2.6);
  moon.addColorStop(0, "rgba(255,255,255,0.95)");
  moon.addColorStop(0.35, "rgba(255,235,250,0.55)");
  moon.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 2.6, 0, Math.PI * 2);
  ctx.fill();

  // mountains silhouette
  ctx.fillStyle = "rgba(8,6,20,0.85)";
  ctx.beginPath();
  ctx.moveTo(0, size);
  let y = size * (0.72 + rnd() * 0.1);
  ctx.lineTo(0, y);
  for (let x = 0; x <= size; x += size / 24) {
    y += (rnd() - 0.5) * size * 0.09;
    y = Math.min(size * 0.94, Math.max(size * 0.55, y));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(size, size);
  ctx.closePath();
  ctx.fill();

  // vignette
  const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.85);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);

  return canvas.toDataURL("image/png");
}

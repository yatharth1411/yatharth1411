import type { LangMode } from "./types";

/* ───────────────────────────── basics ───────────────────────────── */

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function cap(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(arr: T[], seed?: number): T {
  const i = seed === undefined ? Math.floor(Math.random() * arr.length) : seed % arr.length;
  return arr[i];
}

/** trilingual helper */
export function tr(lang: LangMode, en: string, hi: string, hing?: string): string {
  if (lang === "hi") return hi;
  if (lang === "hinglish") return hing ?? en;
  return en;
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDateTime(ts: number): string {
  return `${fmtDate(ts)}, ${fmtTime(ts)}`;
}

/* ─────────────────────────── calculator ─────────────────────────── */

type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "fn"; v: string }
  | { t: "lp" }
  | { t: "rp" };

const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  log: Math.log10,
  ln: Math.log,
  abs: Math.abs,
};

function tokenize(expr: string): Tok[] | null {
  const s = expr
    .toLowerCase()
    .replace(/[×✕]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/,/g, "")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b|\bmultiplied by\b|\binto\b/g, "*")
    .replace(/\bdivided by\b|\bover\b/g, "/")
    .replace(/\bpercent\s+of\b/g, "% of")
    .replace(/\s*%\s*of\s*/g, "*0.01*")
    .replace(/\s+/g, " ");
  const toks: Tok[] = [];
  let i = 0;
  let prev: Tok | null = null;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const n = parseFloat(s.slice(i, j));
      if (isNaN(n)) return null;
      toks.push({ t: "num", v: n });
      prev = toks[toks.length - 1];
      i = j;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-z]/.test(s[j])) j++;
      const w = s.slice(i, j);
      if (w === "pi") toks.push({ t: "num", v: Math.PI });
      else if (w === "e") toks.push({ t: "num", v: Math.E });
      else if (FUNCS[w]) toks.push({ t: "fn", v: w });
      else if (w === "of") toks.push({ t: "op", v: "*" });
      else return null;
      prev = toks[toks.length - 1];
      i = j;
      continue;
    }
    if (ch === "(") {
      // implicit multiplication: 2(3+4) or (2)(3)
      if (prev && (prev.t === "num" || prev.t === "rp")) toks.push({ t: "op", v: "*" });
      toks.push({ t: "lp" });
    } else if (ch === ")") toks.push({ t: "rp" });
    else if ("+-*/^%".includes(ch)) {
      if (ch === "-" && (!prev || prev.t === "op" || prev.t === "lp")) {
        // unary minus
        toks.push({ t: "num", v: 0 });
      }
      toks.push({ t: "op", v: ch });
    } else return null;
    prev = toks[toks.length - 1];
    i++;
  }
  return toks.length ? toks : null;
}

export function calculate(expr: string): number | null {
  const toks = tokenize(expr);
  if (!toks) return null;
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2, "^": 3 };
  const out: Tok[] = [];
  const stack: Tok[] = [];
  for (const tok of toks) {
    if (tok.t === "num") out.push(tok);
    else if (tok.t === "fn") stack.push(tok);
    else if (tok.t === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === "op" && prec[top.v] >= prec[tok.v] && tok.v !== "^") out.push(stack.pop()!);
        else if (top.t === "op" && tok.v === "^" && prec[top.v] > prec[tok.v]) out.push(stack.pop()!);
        else break;
      }
      stack.push(tok);
    } else if (tok.t === "lp") stack.push(tok);
    else {
      while (stack.length && stack[stack.length - 1].t !== "lp") out.push(stack.pop()!);
      if (!stack.length) return null;
      stack.pop();
      if (stack.length && stack[stack.length - 1].t === "fn") out.push(stack.pop()!);
    }
  }
  while (stack.length) {
    const t = stack.pop()!;
    if (t.t === "lp") return null;
    out.push(t);
  }
  const vals: number[] = [];
  for (const tok of out) {
    if (tok.t === "num") vals.push(tok.v);
    else if (tok.t === "fn") {
      const x = vals.pop();
      if (x === undefined) return null;
      vals.push(FUNCS[tok.v](x));
    } else if (tok.t === "op") {
      const b = vals.pop();
      const a = vals.pop();
      if (a === undefined || b === undefined) return null;
      let r: number;
      switch (tok.v) {
        case "+": r = a + b; break;
        case "-": r = a - b; break;
        case "*": r = a * b; break;
        case "/": if (b === 0) return null; r = a / b; break;
        case "%": r = (a * b) / 100; break; // "200 % 10" → 20 (10% of 200); "a % b" reads a% of b when a follows
        case "^": r = Math.pow(a, b); break;
        default: return null;
      }
      vals.push(r);
    }
  }
  if (vals.length !== 1 || !isFinite(vals[0])) return null;
  return vals[0];
}

export function formatNumber(n: number): string {
  const r = Math.round(n * 1e4) / 1e4;
  return r.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

/** pull a math expression out of natural language */
export function extractMath(text: string): string | null {
  let m = text.match(/(?:calculate|compute|solve|evaluate|what(?:'s| is)|kitna hota hai|how much is)\s+([^?]+)/i);
  let expr = (m ? m[1] : text).replace(/[=?]+$/, "").trim();
  if (!/[0-9]/.test(expr)) return null;
  if (!/[+\-*/^%()]|\b(sqrt|sin|cos|tan|log|ln|abs|plus|minus|times|divided|percent|pi)\b/i.test(expr))
    return null;
  if (!/^[\d\s.+\-*/^%()a-z,×÷]+$/i.test(expr)) return null;
  return expr;
}

/* ───────────────────────── unit conversion ──────────────────────── */

const UNIT_TABLE: Record<string, Record<string, number>> = {
  length: { mm: 0.001, cm: 0.01, m: 1, meter: 1, meters: 1, km: 1000, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, foot: 0.3048, feet: 0.3048, yd: 0.9144, mi: 1609.344, mile: 1609.344, miles: 1609.344 },
  weight: { mg: 1e-6, g: 0.001, gram: 0.001, grams: 0.001, kg: 1, kilo: 1, kilogram: 1, kilograms: 1, lb: 0.453592, lbs: 0.453592, pound: 0.453592, pounds: 0.453592, oz: 0.0283495, ounce: 0.0283495, tonne: 1000, quintal: 100 },
  data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
  speed: { kmph: 1, "km/h": 1, kph: 1, mps: 0.277778, "m/s": 0.277778, mph: 1.609344, knot: 1.852, knots: 1.852 },
  time: { sec: 1, second: 1, seconds: 1, min: 60, minute: 60, minutes: 60, hr: 3600, hour: 3600, hours: 3600, day: 86400, days: 86400, week: 604800, weeks: 604800 },
};

const TEMP_UNITS = new Set(["c", "celsius", "f", "fahrenheit", "k", "kelvin"]);

function findUnit(tok: string): { cat: string; unit: string } | null {
  const t = tok.toLowerCase().replace(/°/g, "");
  if (TEMP_UNITS.has(t)) return { cat: "temp", unit: t[0] === "c" ? "c" : t[0] === "f" ? "f" : "k" };
  for (const cat of Object.keys(UNIT_TABLE)) {
    if (UNIT_TABLE[cat][t] !== undefined) return { cat, unit: t };
  }
  return null;
}

export function convert(value: number, fromTok: string, toTok: string): { result: number; from: string; to: string } | null {
  const f = findUnit(fromTok);
  const t = findUnit(toTok);
  if (!f || !t || f.cat !== t.cat) return null;
  if (f.cat === "temp") {
    let c = value;
    if (f.unit === "f") c = ((value - 32) * 5) / 9;
    if (f.unit === "k") c = value - 273.15;
    let out = c;
    if (t.unit === "f") out = (c * 9) / 5 + 32;
    if (t.unit === "k") out = c + 273.15;
    return { result: out, from: fromTok, to: toTok };
  }
  const base = value * UNIT_TABLE[f.cat][f.unit];
  return { result: base / UNIT_TABLE[t.cat][t.unit], from: fromTok, to: toTok };
}

export function extractConversion(text: string): { value: number; from: string; to: string } | null {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*([a-z°\/]+)\s+(?:to|into|in|mein)\s+([a-z°\/]+)/i);
  if (!m) return null;
  return { value: parseFloat(m[1]), from: m[2], to: m[3] };
}

/* ─────────────────────── reminders: time parsing ────────────────── */

export function parseWhen(text: string, now: Date = new Date()): { at: number; label: string } | null {
  const lower = text.toLowerCase();
  const base = new Date(now);

  const rel = lower.match(/in\s+(\d+)\s*(minute|minutes|min|hour|hours|hr|day|days)/);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2];
    const ms = unit.startsWith("min") ? n * 60000 : unit.startsWith("h") ? n * 3600000 : n * 86400000;
    const at = base.getTime() + ms;
    return { at, label: fmtDateTime(at) };
  }

  let day = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let daySet = false;
  if (/tomorrow|kal\b/.test(lower)) {
    day.setDate(day.getDate() + 1);
    daySet = true;
  } else if (/today|aaj\b/.test(lower)) {
    daySet = true;
  } else {
    const iso = lower.match(/(\d{4})-(\d{2})-(\d{2})/);
    const named = lower.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
    if (iso) {
      day = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
      daySet = true;
    } else if (named) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const d = new Date(base.getFullYear(), months.indexOf(named[2].slice(0, 3)), parseInt(named[1]));
      if (d.getTime() < base.getTime()) d.setFullYear(d.getFullYear() + 1);
      day = d;
      daySet = true;
    }
  }

  const tm = lower.match(/(?:at|ko|baje)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:baje)?/);
  let h = 9;
  let min = 0;
  let timeSet = false;
  if (tm && (tm[3] || /:|at\s*\d|baje/.test(lower))) {
    h = parseInt(tm[1], 10);
    min = tm[2] ? parseInt(tm[2], 10) : 0;
    if (tm[3] === "pm" && h < 12) h += 12;
    if (tm[3] === "am" && h === 12) h = 0;
    if (h <= 23 && min <= 59) timeSet = true;
  }
  if (!daySet && !timeSet) return null;
  day.setHours(timeSet ? h : 9, timeSet ? min : 0, 0, 0);
  if (!daySet && day.getTime() <= base.getTime()) day.setDate(day.getDate() + 1);
  return { at: day.getTime(), label: fmtDateTime(day.getTime()) };
}

/* ───────────────────── quotes / shayari / jokes ─────────────────── */

export const QUOTES: string[] = [
  "“The secret of getting ahead is getting started.” — Mark Twain",
  "“It always seems impossible until it's done.” — Nelson Mandela",
  "“Don't watch the clock; do what it does. Keep going.” — Sam Levenson",
  "“Believe you can and you're halfway there.” — Theodore Roosevelt",
  "“Your only limit is your mind.”",
  "“Small steps every day add up to big results.”",
  "“Discipline is choosing what you want most over what you want now.”",
  "“Push yourself, because no one else is going to do it for you.”",
  "“Dream big. Start small. Act now.” — Robin Sharma",
  "“Success is the sum of small efforts, repeated day in and day out.” — Robert Collier",
  "“You didn't come this far to only come this far.”",
  "“Do something today that your future self will thank you for.”",
  "“Strive for progress, not perfection.”",
  "“The harder you work for something, the greater you'll feel when you achieve it.”",
  "“A little progress each day adds up to big results.”",
  "“Great things never come from comfort zones.”",
  "“Wake up with determination. Go to bed with satisfaction.”",
  "“Your passion is waiting for your courage to catch up.”",
];

export const SHAYARI: string[] = [
  "तुम्हारी मुस्कान की तरह चमके हर दिन,\nखुशियों से भर जाए जीवन यही दुआ है मेरी। 🌸",
  "सितारों से आगे जहाँ और भी हैं,\nअभी इश्क़ के इम्तिहाँ और भी हैं। — मोहम्मद रफ़ी का यह नग़मा",
  "ख्वाहिशों की राहों में चलते रहो,\nमंज़िल खुद चलकर तुम्हारे पास आएगी। ✨",
  "हवाओं में तेरी खुशबू सी बसी है,\nयूँ लगता है मौसम भी तुझसे बातें करता है। 🌙",
  "चाँद सा चेहरा, नई सुबह सा नूर,\nतुम जहाँ रहो, वहाँ रौनक़ ही रौनक़ हो। 💜",
  "मेहनत की मिट्टी में सोना उगता है,\nजो सपने देखता है, वही उन्हें पाता है।",
  "दिल के दीये में उम्मीद जलाए रख,\nअंधेरे कितने भी हों, सुबह आएगी ज़रूर। 🌅",
  "तेरी हँसी की सदा सुनकर फ़िज़ाएँ भी शर्माएँ,\nऐ हसीन लम्हा, तू यूँ ही ठहरा जाए।",
];

export const JOKES: string[] = [
  "Why don't scientists trust atoms? Because they make up everything! 😄",
  "I told my computer I needed a break… now it won't stop sending me KitKat ads. 🍫",
  "Why did the developer go broke? Because he used up all his cache. 💸",
  "Parallel lines have so much in common… shame they'll never meet. 📐",
  "My bed is a magical place where I suddenly remember everything I forgot to do. 🛏️",
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "I'm on a seafood diet. I see food… and I eat it. 🍕",
  "Teacher: 'Why are you late?' Student: 'Because of the sign.' 'What sign?' 'School Ahead, Go Slow.' 🐢",
];

/* ─────────────────── fitness / diet / study / ideas ─────────────── */

export function fitnessPlan(): string {
  return [
    "**Your balanced daily fitness plan** 💪",
    "- Morning: 10 min stretching + 5 Surya Namaskar",
    "- Cardio (20–30 min): brisk walk, cycling, or skipping",
    "- Strength (alternate days): push-ups 3×10, squats 3×15, plank 3×45s",
    "- Evening: 15 min walk after dinner",
    "- Hydration: 2.5–3L water; sleep 7–8 hours",
    "",
    "Tip: consistency beats intensity — 5 regular days > 1 heroic day. Start light, progress weekly. 💜",
  ].join("\n");
}

export function dietPlan(): string {
  return [
    "**Simple healthy Indian diet plan** 🥗",
    "- Breakfast: oats/poha/upma + 1 fruit + nuts",
    "- Mid-morning: buttermilk or coconut water",
    "- Lunch: 2 roti or 1 bowl rice + dal + sabzi + salad",
    "- Snack: roasted chana / sprouts / fruit",
    "- Dinner (by 8 pm): light — khichdi, dalia, or roti + veg",
    "- Limit: sugar, fried food, late-night snacking",
    "",
    "Golden rule: half plate veggies, quarter protein, quarter carbs. And an occasional treat is allowed — guilt-free! ✨",
  ].join("\n");
}

export function studyPlan(): string {
  return [
    "**Study smart, not just hard** 📚",
    "- Pomodoro: 25 min focus + 5 min break; after 4 rounds take 30 min",
    "- Active recall: close the book, write what you remember",
    "- Spaced repetition: revise after 1 day, 3 days, 1 week",
    "- Teach it: explain a topic aloud as if to a friend (I'm a great listener! 😊)",
    "- Phone in another room; one subject per session",
    "",
    "Tell me your subject and I'll make a topic-wise plan for you.",
  ].join("\n");
}

const IDEA_DOMAINS = ["AI-powered", "hyperlocal", "subscription-based", "eco-friendly", "WhatsApp-first", "vernacular", "D2C", "B2B SaaS"];
const IDEA_NICHES = [
  "tiffin & meal service for students",
  "pet care and grooming at home",
  "regional-language learning app",
  "farm-to-home fresh produce delivery",
  "senior-citizen companionship & errands",
  "reselling platform for thrift fashion",
  "fitness coaching for busy professionals",
  "digital menu + ordering for small cafés",
  "rental marketplace for cameras & tools",
  "personal finance coach for first-jobbers",
  "event planning for small towns",
  "skill-swap community platform",
];

export function businessIdea(): string {
  const idea = `${pick(IDEA_DOMAINS)} ${pick(IDEA_NICHES)}`;
  return [
    `**Business idea for you** 💡 — a **${idea}**.`,
    "",
    "How to validate it this week:",
    "- Talk to 10 potential customers; ask about their current workaround",
    "- Build a one-page landing + WhatsApp number; measure signups",
    "- Pre-sell to 3 customers before building anything",
    "",
    "Want me to draft a name, tagline, and a 30-second pitch for this one?",
  ].join("\n");
}

export function codingHelp(): string {
  return [
    "I'd love to help you code! 👩‍💻 Here's how we can work:",
    "- Paste your code + the error — I'll debug it",
    "- Say “explain recursion like I'm 10” for concepts",
    "- Ask for boilerplate: “write a FastAPI CRUD endpoint”",
    "- Ask me to review: “review this function”",
    "",
    "Quick tips: read errors bottom-up, rubber-duck the problem to me, and keep functions under ~20 lines. What are you building?",
  ].join("\n");
}

/* ─────────────────────────── email drafter ──────────────────────── */

export function emailDraft(to: string, topic: string, tone: string): string {
  const subj = topic.charAt(0).toUpperCase() + topic.slice(1);
  const greeting =
    tone === "formal" ? `Dear ${to},` : tone === "friendly" ? `Hey ${to},` : `Hi ${to},`;
  const opening =
    tone === "formal"
      ? `I hope this message finds you well. I am writing regarding ${topic}.`
      : `Hope you're doing great! Quick note about ${topic}.`;
  const body =
    tone === "formal"
      ? `I would appreciate the opportunity to discuss this further at your earliest convenience. Please let me know a suitable time, or feel free to share your thoughts over email.`
      : `Could we sync up on this sometime this week? Even a quick reply here works — whatever's easiest for you.`;
  const closing = tone === "formal" ? "Warm regards," : "Cheers,";
  return [
    `**Subject:** ${subj}`,
    "",
    greeting,
    "",
    opening,
    "",
    body,
    "",
    closing,
    "[Your name]",
    "",
    "_(Tell me the details and I'll fill in the specifics — dates, names, numbers.)_",
  ].join("\n");
}

/* ─────────────────────── offline mini translator ────────────────── */

const PHRASEBOOK: Record<string, string> = {
  hello: "नमस्ते", hi: "नमस्ते", "good morning": "सुप्रभात", "good night": "शुभ रात्रि",
  "good evening": "शुभ संध्या", "thank you": "धन्यवाद", thanks: "धन्यवाद", please: "कृपया",
  yes: "हाँ", no: "नहीं", sorry: "माफ़ कीजिए", "excuse me": "सुनिए",
  "how are you": "आप कैसे हैं", "i am fine": "मैं ठीक हूँ", "what is your name": "आपका नाम क्या है",
  "my name is": "मेरा नाम है", "i love you": "मैं तुमसे प्यार करता/करती हूँ", welcome: "स्वागत है",
  goodbye: "अलविदा", "see you": "फिर मिलेंगे", water: "पानी", food: "खाना", help: "मदद",
  friend: "दोस्त", family: "परिवार", love: "प्यार", beautiful: "सुंदर", happy: "खुश",
  today: "आज", tomorrow: "कल", yesterday: "कल (बीता हुआ)", time: "समय", money: "पैसा",
};

const PHRASEBOOK_HI: Record<string, string> = {
  "नमस्ते": "hello", "धन्यवाद": "thank you", "सुप्रभात": "good morning", "शुभ रात्रि": "good night",
  "हाँ": "yes", "नहीं": "no", "पानी": "water", "खाना": "food", "मदद": "help", "दोस्त": "friend",
  "परिवार": "family", "प्यार": "love", "सुंदर": "beautiful", "खुश": "happy", "आज": "today",
  "कल": "tomorrow/yesterday", "समय": "time", "पैसा": "money", "माफ़ कीजिए": "sorry",
};

export function translateOffline(text: string, target: string): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/^(hindi|हिंदी|हिन्दी)/i.test(target)) {
    if (PHRASEBOOK[t]) return PHRASEBOOK[t];
    // word-by-word fallback
    const words = t.split(/\s+/).map((w) => PHRASEBOOK[w] ?? w);
    if (words.some((w) => /[\u0900-\u097F]/.test(w))) return words.join(" ");
    return null;
  }
  if (/^english/i.test(target)) {
    const trimmed = text.trim().replace(/[.!?।]+$/, "");
    if (PHRASEBOOK_HI[trimmed]) return PHRASEBOOK_HI[trimmed];
    const words = trimmed.split(/\s+/).map((w) => PHRASEBOOK_HI[w] ?? w);
    if (words.some((w) => /^[a-z/]+$/.test(w))) return words.join(" ");
  }
  return null;
}

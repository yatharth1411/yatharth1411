"use client";

import type { LangMode } from "./types";

/* ───────────────────────── capability checks ────────────────────── */

export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSTTSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );
}

/* ─────────────────────────── text to speech ─────────────────────── */

export function listVoices(): SpeechSynthesisVoice[] {
  if (!isTTSSupported()) return [];
  return window.speechSynthesis.getVoices();
}

const PREFERRED = [
  "google uk english female", "google us english", "microsoft zira", "microsoft sonia",
  "samantha", "victoria", "karen", "moira", "google हिन्दी", "microsoft swara", "lekha", "heera",
];

export function pickVoice(lang: string, voiceName?: string): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (!voices.length) return null;
  if (voiceName) {
    const exact = voices.find((v) => v.name === voiceName);
    if (exact) return exact;
  }
  const base = lang.toLowerCase().split("-")[0];
  const langMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = langMatches.length ? langMatches : voices;
  for (const pref of PREFERRED) {
    const hit = pool.find((v) => v.name.toLowerCase().includes(pref));
    if (hit) return hit;
  }
  const female = pool.find((v) => /female|zira|sonia|swara|samantha|heera|lekha/i.test(v.name));
  return female ?? pool[0];
}

export interface SpeakOpts {
  lang?: string;
  rate?: number;
  pitch?: number;
  voiceName?: string;
  onend?: () => void;
}

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code snippet ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[*_`#>\[\]]/g, "")
    .replace(/https?:\/\/\S+/g, " link ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function speak(text: string, opts: SpeakOpts = {}): void {
  if (!isTTSSupported()) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const lang = opts.lang ?? "en-IN";
  u.lang = lang;
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1.05;
  const v = pickVoice(lang, opts.voiceName);
  if (v) u.voice = v;
  if (opts.onend) u.onend = opts.onend;
  window.speechSynthesis.speak(u);
}

export function stopSpeak(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

/* ─────────────────────────── speech to text ─────────────────────── */

export interface RecogOpts {
  lang: string;
  continuous?: boolean;
  interim?: boolean;
  onResult: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (e: unknown) => void;
}

export interface RecogHandle {
  stop: () => void;
}

export function startRecognition(opts: RecogOpts): RecogHandle | null {
  if (!isSTTSupported()) return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = opts.lang;
  rec.continuous = opts.continuous ?? false;
  rec.interimResults = opts.interim ?? true;
  rec.maxAlternatives = 1;
  let stopped = false;
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) opts.onResult(res[0].transcript.trim(), true);
      else interim += res[0].transcript;
    }
    if (interim) opts.onResult(interim.trim(), false);
  };
  rec.onerror = (e: unknown) => opts.onError?.(e);
  rec.onend = () => {
    if (!stopped) opts.onEnd?.();
  };
  try {
    rec.start();
  } catch {
    return null;
  }
  return {
    stop: () => {
      stopped = true;
      try { rec.stop(); } catch { /* noop */ }
    },
  };
}

/* ───────────────────────────── wake word ────────────────────────── */

export const WAKE_REGEX = /(hey|hi|हे|ओए|a)\s+(sheetal|shetal|shital|शीतल|sital)/i;

export function matchWake(text: string): boolean {
  return WAKE_REGEX.test(text);
}

export function stripWake(text: string): string {
  return text.replace(WAKE_REGEX, "").replace(/^[\s,.!?:;-]+/, "").trim();
}

export function recogLang(lang: LangMode): string {
  return lang === "hi" ? "hi-IN" : lang === "hinglish" ? "hi-IN" : "en-IN";
}

export function ttsLang(lang: LangMode): string {
  return lang === "hi" ? "hi-IN" : "en-IN";
}

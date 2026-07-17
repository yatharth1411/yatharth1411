"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { Attachment, ChatMessage } from "@/lib/types";
import { parseFile, type ParsedFile } from "@/lib/fileparse";
import { isSTTSupported, recogLang, speak, startRecognition, stopSpeak, ttsLang } from "@/lib/speech";
import { fmtTime } from "@/lib/tools";
import {
  IconFile, IconHeart, IconImage, IconMic, IconSend, IconSpeaker, IconX,
} from "./icons";

/* ──────────────────────── rich text renderer ────────────────────── */

function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let rest = s;
  let k = 0;
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:[^)\s]+)\))|(_([^_]+)_)/;
  while (rest) {
    const m = rest.match(re);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    if (m[2]) out.push(<strong key={k++} className="font-semibold text-white">{m[2]}</strong>);
    else if (m[4]) out.push(<a key={k++} href={m[5]} target="_blank" rel="noreferrer">{m[4]}</a>);
    else if (m[7]) out.push(<em key={k++} className="text-white/70">{m[7]}</em>);
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

export function RichText({ text }: { text: string }) {
  return (
    <div className="rich space-y-0.5 leading-relaxed">
      {text.split("\n").map((line, i) => {
        if (/^\s*[-•]\s+/.test(line))
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-purple-300">•</span>
              <span>{inline(line.replace(/^\s*[-•]\s+/, ""))}</span>
            </div>
          );
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}

/* ─────────────────────────── typewriter ─────────────────────────── */

function Typewriter({ text, onTick, onDone }: { text: string; onTick: () => void; onDone: () => void }) {
  const [n, setN] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    if (n >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    const step = Math.max(2, Math.round(text.length / 180));
    const t = window.setTimeout(() => {
      setN((x) => Math.min(text.length, x + step));
      onTick();
    }, 14);
    return () => window.clearTimeout(t);
  }, [n, text, onTick, onDone]);
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {text.slice(0, n)}
      <span className="type-caret" />
    </span>
  );
}

/* ─────────────────────────── message view ───────────────────────── */

function MessageView({
  msg, isLast, onTick,
}: {
  msg: ChatMessage;
  isLast: boolean;
  onTick: () => void;
}) {
  const store = useStore();
  const isUser = msg.role === "user";
  const revealing = !isUser && msg.reveal && isLast;

  const speakThis = () => {
    const s = store.settings;
    speak(msg.content, { lang: ttsLang(s.lang), rate: s.rate, pitch: s.pitch, voiceName: s.voiceName });
  };

  return (
    <div className={`msg-in flex w-full gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-sky-400 text-sm shadow-glow">
          💜
        </div>
      )}
      <div className={`max-w-[82%] sm:max-w-[72%] ${isUser ? "bubble-user" : "bubble-ai"} px-4 py-3 text-[15px]`}>
        {msg.attachment?.dataUrl && (
          <a href={msg.attachment.dataUrl} download={msg.attachment.name} className="mb-2 block overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.attachment.dataUrl} alt={msg.attachment.name} className="max-h-72 w-full rounded-xl object-cover" />
          </a>
        )}
        {msg.attachment && !msg.attachment.dataUrl && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
            <IconFile className="h-5 w-5 flex-none text-purple-300" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{msg.attachment.name}</p>
              <p className="text-xs text-white/45">
                {msg.attachment.text
                  ? `${msg.attachment.text.length.toLocaleString()} characters extracted`
                  : "attached file"}
              </p>
            </div>
          </div>
        )}
        {revealing ? (
          <Typewriter
            text={msg.content}
            onTick={onTick}
            onDone={() => store.updateMessage(msg.id, { reveal: false })}
          />
        ) : (
          msg.content && <RichText text={msg.content} />
        )}
        <div className={`mt-1.5 flex items-center gap-2 text-[10px] ${isUser ? "justify-end text-white/60" : "text-white/35"}`}>
          <span>{fmtTime(msg.ts)}</span>
          {!isUser && !revealing && (
            <button onClick={speakThis} title="Read aloud" className="rounded-full p-0.5 transition hover:text-pink-300">
              <IconSpeaker className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── chat ────────────────────────────── */

const SUGGESTIONS = [
  "Motivate me ✨",
  "Weather in Mumbai 🌤️",
  "Give me a business idea 💡",
  "मुझे एक शायरी सुनाओ 🌸",
  "Remind me to drink water in 30 minutes ⏰",
  "What is 18% of 4500? 🧮",
  "Draft an email to my manager about leave ✉️",
  "Generate an image of a sunset over mountains 🎨",
];

export default function Chat({
  onSend, typing,
}: {
  onSend: (text: string, attachment?: Attachment) => void | Promise<void>;
  typing: boolean;
}) {
  const store = useStore();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ParsedFile | null>(null);
  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const [sttSupported, setSttSupported] = useState(false);
  useEffect(() => {
    setSttSupported(isSTTSupported());
  }, []);

  const scrollToEnd = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (force || nearBottom) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToEnd(true);
  }, [store.messages.length, typing, scrollToEnd]);

  useEffect(() => {
    const iv = window.setInterval(() => scrollToEnd(false), 400);
    return () => window.clearInterval(iv);
  }, [scrollToEnd]);

  useEffect(() => () => {
    recogRef.current?.stop();
  }, []);

  const doSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content && !pending) return;
    const attachment: Attachment | undefined = pending
      ? { name: pending.name, mime: pending.mime, dataUrl: pending.dataUrl, text: pending.text, note: pending.note }
      : undefined;
    setInput("");
    setPending(null);
    stopSpeak();
    await onSend(content, attachment);
  };

  const toggleMic = () => {
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const handle = startRecognition({
      lang: recogLang(store.settings.lang),
      continuous: false,
      interim: true,
      onResult: (text, isFinal) => {
        if (isFinal) {
          setListening(false);
          void doSend(text);
        } else {
          setInput(text);
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!handle) return;
    recogRef.current = handle;
    setListening(true);
  };

  const onPickFile = async (f: File | undefined) => {
    if (!f) return;
    setParsing(true);
    try {
      const parsed = await parseFile(f);
      setPending(parsed);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const empty = store.messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {empty && (
          <div className="mx-auto mt-6 max-w-lg text-center">
            <div className="glass gradient-border mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] text-4xl shadow-glow">
              <IconHeart className="h-9 w-9 text-pink-400 heart-beat" />
            </div>
            <h2 className="gradient-text mt-4 text-2xl font-bold">Sheetal Darling</h2>
            <p className="mt-2 text-sm text-white/55">
              Your caring AI companion — chat, voice, reminders, notes, weather, news, art & more.
              Try one of these:
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => void doSend(sug)}
                  className="glass-soft glass-hover rounded-full px-4 py-2 text-xs text-white/80"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {store.messages.map((m, i) => (
          <MessageView
            key={m.id}
            msg={m}
            isLast={i === store.messages.length - 1}
            onTick={() => scrollToEnd(false)}
          />
        ))}

        {typing && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-sky-400 text-sm">
              💜
            </div>
            <div className="bubble-ai flex items-center gap-1.5 px-4 py-3.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* pending attachment chip */}
      {(pending || parsing) && (
        <div className="px-4 pb-2 sm:px-6">
          <div className="glass-soft inline-flex max-w-full items-center gap-2.5 rounded-2xl px-3.5 py-2">
            {parsing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            ) : pending?.dataUrl ? (
              <IconImage className="h-4 w-4 text-pink-300" />
            ) : (
              <IconFile className="h-4 w-4 text-purple-300" />
            )}
            <span className="max-w-[220px] truncate text-sm">
              {parsing ? "Reading your file…" : pending?.name}
            </span>
            {pending?.note && <span className="text-xs text-amber-300/90">· {pending.note}</span>}
            {!parsing && (
              <button onClick={() => setPending(null)} className="text-white/50 hover:text-white">
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* input bar */}
      <div className="px-4 pb-4 pt-1 sm:px-6">
        <div className="glass gradient-border flex items-end gap-2 rounded-3xl p-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv,.json,image/*,.js,.ts,.py,.html,.css"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach a file (PDF, Word, image, text)"
            className="btn-ghost flex h-11 w-11 flex-none items-center justify-center rounded-2xl"
          >
            <IconFile className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void doSend();
              }
            }}
            rows={1}
            placeholder={
              listening
                ? "Listening… speak now 🎙️"
                : store.settings.lang === "hi"
                  ? "कुछ भी लिखिए… 💜"
                  : store.settings.lang === "hinglish"
                    ? "Kuch bhi likho… 💜"
                    : "Message Sheetal… 💜"
            }
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-white/35"
          />
          {sttSupported && (
            <button
              onClick={toggleMic}
              title={listening ? "Stop listening" : "Speak to Sheetal"}
              className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl transition ${
                listening ? "bg-pink-500/90 text-white pulse-ring" : "btn-ghost"
              }`}
            >
              <IconMic className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => void doSend()}
            disabled={!input.trim() && !pending}
            className="btn-primary flex h-11 w-11 flex-none items-center justify-center rounded-2xl"
            title="Send"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-white/30">
          Sheetal remembers only with your permission · everything stays encrypted on this device 🔒
        </p>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { CalEvent, LangMode, NoteItem } from "@/lib/types";
import { fmtDateTime, fmtTime, uid } from "@/lib/tools";
import { generateArt } from "@/lib/artgen";
import { parseFile, type ParsedFile } from "@/lib/fileparse";
import { summarizeText } from "@/lib/summarize";
import { isSTTSupported, listVoices, recogLang, speak, ttsLang } from "@/lib/speech";
import { RichText } from "./Chat";
import {
  IconBell, IconCal, IconCheck, IconCloud, IconDownload, IconFile, IconGear, IconImage,
  IconLock, IconNews, IconNote, IconPin, IconPlus, IconRefresh, IconSearch, IconSpeaker,
  IconTask, IconTrash, IconWake, IconX,
} from "./icons";

/* ────────────────────────────── shell ───────────────────────────── */

function PanelShell({
  icon, title, subtitle, actions, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="glass gradient-border flex h-11 w-11 items-center justify-center rounded-2xl text-purple-300">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="gradient-text text-xl font-bold">{title}</h2>
            {subtitle && <p className="truncate text-xs text-white/45">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left">
      <span className="switch" data-on={on} />
      <span>
        <span className="block text-sm font-medium text-white/90">{label}</span>
        {hint && <span className="block text-xs text-white/45">{hint}</span>}
      </span>
    </button>
  );
}

/* ────────────────────────────── notes ───────────────────────────── */

export function NotesPanel() {
  const store = useStore();
  const [editing, setEditing] = useState<NoteItem | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const startNew = () => {
    setEditing(null);
    setTitle("");
    setBody("");
  };

  const save = () => {
    if (!title.trim() && !body.trim()) return;
    if (editing) store.updateNote(editing.id, { title: title.trim() || "Untitled", body });
    else store.addNote(title.trim() || "Untitled", body);
    startNew();
  };

  return (
    <PanelShell
      icon={<IconNote />}
      title="Notes"
      subtitle="Your thoughts, kept safe & encrypted"
      actions={
        <button onClick={startNew} className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs">
          <IconPlus className="h-4 w-4" /> New
        </button>
      }
    >
      <div className="glass rounded-3xl p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title…"
          className="field w-full px-4 py-2.5 text-sm font-medium"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your heart out… 💜"
          rows={4}
          className="field mt-2 w-full resize-none px-4 py-2.5 text-sm"
        />
        <div className="mt-2 flex justify-end gap-2">
          {(editing || title || body) && (
            <button onClick={startNew} className="btn-ghost px-4 py-2 text-xs">Cancel</button>
          )}
          <button onClick={save} className="btn-primary px-5 py-2 text-xs">
            {editing ? "Update note" : "Save note"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {store.notes.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">
            No notes yet — or just tell Sheetal: “note that my wifi password is…” 📝
          </p>
        )}
        {store.notes.map((n) => (
          <div key={n.id} className="glass glass-hover rounded-3xl p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white/95">{n.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/60">{n.body}</p>
                <p className="mt-2 text-[10px] text-white/30">{fmtDateTime(n.updatedAt)}</p>
              </div>
              <button
                onClick={() => { setEditing(n); setTitle(n.title); setBody(n.body); }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Edit
              </button>
              <button onClick={() => store.removeNote(n.id)} className="rounded-full p-1.5 text-white/40 hover:text-pink-400">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

/* ────────────────────────────── tasks ───────────────────────────── */

export function TasksPanel() {
  const store = useStore();
  const [text, setText] = useState("");
  const pending = store.tasks.filter((t) => !t.done);
  const done = store.tasks.filter((t) => t.done);

  const add = () => {
    if (!text.trim()) return;
    store.addTask(text.trim());
    setText("");
  };

  const Row = ({ t }: { t: (typeof store.tasks)[number] }) => (
    <div className={`glass flex items-center gap-3 rounded-2xl px-4 py-3 ${t.done ? "opacity-55" : ""}`}>
      <button
        onClick={() => store.toggleTask(t.id)}
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition ${
          t.done ? "border-pink-400 bg-gradient-to-br from-purple-500 to-pink-500" : "border-white/25 hover:border-purple-300"
        }`}
      >
        {t.done && <IconCheck className="h-3.5 w-3.5 text-white" />}
      </button>
      <span className={`flex-1 text-sm ${t.done ? "line-through" : ""}`}>{t.text}</span>
      <button onClick={() => store.removeTask(t.id)} className="text-white/35 hover:text-pink-400">
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <PanelShell icon={<IconTask />} title="Tasks" subtitle={`${pending.length} pending · ${done.length} completed`}>
      <div className="glass flex items-center gap-2 rounded-3xl p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task… e.g. Call the bank"
          className="min-h-[42px] flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-white/35"
        />
        <button onClick={add} className="btn-primary flex h-10 w-10 items-center justify-center rounded-2xl">
          <IconPlus className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {store.tasks.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">
            All clear! ✨ Try telling Sheetal: “add task buy groceries”
          </p>
        )}
        {pending.map((t) => <Row key={t.id} t={t} />)}
        {done.length > 0 && pending.length > 0 && (
          <p className="pt-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">Completed</p>
        )}
        {done.map((t) => <Row key={t.id} t={t} />)}
      </div>
    </PanelShell>
  );
}

/* ──────────────────────────── reminders ─────────────────────────── */

export function RemindersPanel() {
  const store = useStore();
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");

  const add = () => {
    if (!text.trim() || !when) return;
    const at = new Date(when).getTime();
    if (isNaN(at)) return;
    store.addReminder(text.trim(), at);
    setText("");
    setWhen("");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  };

  const quick = (mins: number) => {
    const d = new Date(Date.now() + mins * 60000);
    const pad = (n: number) => String(n).padStart(2, "0");
    setWhen(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const upcoming = store.reminders.filter((r) => !r.fired);
  const past = store.reminders.filter((r) => r.fired);

  return (
    <PanelShell icon={<IconBell />} title="Reminders" subtitle="Sheetal will nudge you — gently, on time">
      <div className="glass rounded-3xl p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Remind me to…"
          className="field w-full px-4 py-2.5 text-sm"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="field flex-1 px-4 py-2.5 text-sm [color-scheme:dark]"
          />
          <button onClick={add} disabled={!text.trim() || !when} className="btn-primary px-5 py-2.5 text-xs">
            Set reminder
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {[["+10 min", 10], ["+30 min", 30], ["+1 hour", 60], ["+3 hours", 180]].map(([label, mins]) => (
            <button key={label as string} onClick={() => quick(mins as number)} className="btn-ghost px-3 py-1.5 text-[11px]">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {store.reminders.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">
            Nothing scheduled ⏰ — or say: “remind me to call mom at 7pm”
          </p>
        )}
        {upcoming.map((r) => (
          <div key={r.id} className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/40 to-pink-500/30">
              <IconBell className="h-4 w-4 text-pink-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.text}</p>
              <p className="text-xs text-purple-300/90">{fmtDateTime(r.at)}</p>
            </div>
            <button onClick={() => store.removeReminder(r.id)} className="text-white/35 hover:text-pink-400">
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
        {past.map((r) => (
          <div key={r.id} className="glass flex items-center gap-3 rounded-2xl px-4 py-3 opacity-45">
            <IconCheck className="h-4 w-4 flex-none text-emerald-300" />
            <p className="min-w-0 flex-1 truncate text-sm line-through">{r.text}</p>
            <span className="text-[10px] text-white/40">{fmtTime(r.at)}</span>
            <button onClick={() => store.removeReminder(r.id)} className="text-white/35 hover:text-pink-400">
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

/* ───────────────────────────── calendar ─────────────────────────── */

function exportICS(events: CalEvent[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SheetalDarling//Calendar//EN"];
  for (const e of events) {
    const dt = e.time
      ? `DTSTART:${e.date.replace(/-/g, "")}T${e.time.replace(":", "")}00`
      : `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`;
    lines.push("BEGIN:VEVENT", `UID:${e.id}@sheetal-darling`, dt, `SUMMARY:${e.title.replace(/[,;]/g, " ")}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sheetal-calendar.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function CalendarPanel() {
  const store = useStore();
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const first = new Date(ym.y, ym.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const isoFor = (d: number) =>
    `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const eventsOn = (iso: string) => store.events.filter((e) => e.date === iso);
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const move = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const add = () => {
    if (!title.trim()) return;
    store.addEvent(title.trim(), selected, time || undefined);
    setTitle("");
    setTime("");
  };

  return (
    <PanelShell
      icon={<IconCal />}
      title="Calendar"
      subtitle="Plan your days · export to Google/Apple Calendar"
      actions={
        <button
          onClick={() => exportICS(store.events)}
          disabled={!store.events.length}
          className="btn-ghost flex items-center gap-1.5 px-3.5 py-2 text-xs"
        >
          <IconDownload className="h-4 w-4" /> Export .ics
        </button>
      }
    >
      <div className="glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => move(-1)} className="btn-ghost h-8 w-8 rounded-full">‹</button>
          <p className="font-semibold">
            {first.toLocaleDateString([], { month: "long", year: "numeric" })}
          </p>
          <button onClick={() => move(1)} className="btn-ghost h-8 w-8 rounded-full">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-white/35">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />;
            const iso = isoFor(d);
            const has = eventsOn(iso).length > 0;
            const isSel = iso === selected;
            const isToday = iso === todayIso;
            return (
              <button
                key={i}
                onClick={() => setSelected(iso)}
                className={`relative aspect-square rounded-xl text-sm transition ${
                  isSel
                    ? "bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white shadow-glow"
                    : isToday
                      ? "bg-white/10 font-semibold text-purple-200"
                      : "text-white/70 hover:bg-white/5"
                }`}
              >
                {d}
                {has && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-pink-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass mt-4 rounded-3xl p-4">
        <p className="mb-2 text-sm font-semibold text-white/80">
          {new Date(selected + "T12:00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Event title…"
            className="field min-w-0 flex-1 px-4 py-2.5 text-sm"
          />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field px-3 py-2.5 text-sm [color-scheme:dark]" />
          <button onClick={add} disabled={!title.trim()} className="btn-primary px-4 py-2.5 text-xs">Add</button>
        </div>
        <div className="mt-3 space-y-2">
          {eventsOn(selected).length === 0 && <p className="py-2 text-xs text-white/35">No events on this day.</p>}
          {eventsOn(selected).map((e) => (
            <div key={e.id} className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-2.5">
              <span className="h-2 w-2 flex-none rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
              <span className="flex-1 text-sm">{e.title}</span>
              {e.time && <span className="text-xs text-purple-300/90">{e.time}</span>}
              <button onClick={() => store.removeEvent(e.id)} className="text-white/35 hover:text-pink-400">
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {store.events.length > 0 && (
        <div className="glass mt-4 rounded-3xl p-4">
          <p className="mb-2 text-sm font-semibold text-white/80">Upcoming</p>
          <div className="space-y-2">
            {store.events.filter((e) => e.date >= todayIso).slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm text-white/70">
                <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-purple-200">{e.date.slice(5)}</span>
                <span className="flex-1 truncate">{e.title}</span>
                {e.time && <span className="text-xs text-white/40">{e.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

/* ────────────────────────────── weather ─────────────────────────── */

interface WeatherData {
  city: string; temp: number; feels: number; desc: string; icon: string;
  humidity: number; wind: number; demo?: boolean;
}

export function WeatherPanel() {
  const [city, setCity] = useState("Mumbai");
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const w = await res.json();
      if (typeof w.temp === "number") setData(w);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(`/api/weather?city=Mumbai`);
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => void load(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => setLoading(false),
      { timeout: 8000 }
    );
  };

  return (
    <PanelShell icon={<IconCloud />} title="Weather" subtitle="Live skies, dressed up beautifully">
      <div className="glass flex items-center gap-2 rounded-3xl p-2">
        <IconSearch className="ml-2 h-4 w-4 flex-none text-white/40" />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load(`/api/weather?city=${encodeURIComponent(city)}`)}
          placeholder="City name…"
          className="min-h-[42px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-white/35"
        />
        <button onClick={locate} title="Use my location" className="btn-ghost flex h-10 w-10 items-center justify-center rounded-2xl">
          <IconPin className="h-4 w-4" />
        </button>
        <button
          onClick={() => void load(`/api/weather?city=${encodeURIComponent(city)}`)}
          className="btn-primary flex h-10 w-10 items-center justify-center rounded-2xl"
        >
          <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {data && (
        <div className="glass gradient-border mt-4 overflow-hidden rounded-[2rem] p-8 text-center">
          <p className="text-sm text-white/55">{data.city}</p>
          <p className="mt-2 text-7xl">{data.icon}</p>
          <p className="gradient-text mt-2 text-6xl font-extrabold">{Math.round(data.temp)}°</p>
          <p className="mt-1 capitalize text-white/75">{data.desc}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="glass-soft rounded-2xl p-3">
              <p className="text-lg font-semibold">{Math.round(data.feels)}°</p>
              <p className="text-[11px] text-white/45">Feels like</p>
            </div>
            <div className="glass-soft rounded-2xl p-3">
              <p className="text-lg font-semibold">{data.humidity}%</p>
              <p className="text-[11px] text-white/45">Humidity</p>
            </div>
            <div className="glass-soft rounded-2xl p-3">
              <p className="text-lg font-semibold">{data.wind}</p>
              <p className="text-[11px] text-white/45">Wind km/h</p>
            </div>
          </div>
          {data.demo && (
            <p className="mt-4 text-[11px] text-amber-300/80">
              Demo data — add OPENWEATHER_API_KEY to .env.local for live weather 🌦️
            </p>
          )}
        </div>
      )}
    </PanelShell>
  );
}

/* ─────────────────────────────── news ───────────────────────────── */

interface NewsItem { title: string; url: string; by: string; score: number }

export function NewsPanel({ onAsk }: { onAsk: (text: string) => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/news");
      const d = await res.json();
      setItems(d.items ?? []);
      setDemo(!!d.demo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PanelShell
      icon={<IconNews />}
      title="News Briefing"
      subtitle="Top stories, curated for you"
      actions={
        <div className="flex gap-2">
          <button onClick={() => onAsk("Give me the news headlines")} className="btn-primary px-4 py-2 text-xs">
            Brief me in chat 💬
          </button>
          <button onClick={() => void load()} className="btn-ghost flex h-9 w-9 items-center justify-center rounded-2xl">
            <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      }
    >
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="glass shimmer h-20 rounded-3xl" />)}
        </div>
      )}
      {!loading && (
        <div className="space-y-3">
          {demo && (
            <p className="text-xs text-amber-300/80">Offline demo headlines — connect to the internet for live stories.</p>
          )}
          {items.map((n, i) => (
            <a key={i} href={n.url} target="_blank" rel="noreferrer" className="glass glass-hover block rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <span className="gradient-text flex-none text-lg font-extrabold">{i + 1}</span>
                <div>
                  <h3 className="font-medium leading-snug text-white/90">{n.title}</h3>
                  <p className="mt-1 text-xs text-white/40">
                    ▲ {n.score} · {n.by && `by ${n.by} · `}tap to read
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

/* ─────────────────────────────── files ──────────────────────────── */

export function FilesPanel({ onSendFile }: { onSendFile: (f: File) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParsedFile | null>(null);
  const [summary, setSummary] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setSummary("");
    try {
      const parsed = await parseFile(f);
      setResult(parsed);
      if (parsed.text) setSummary(summarizeText(parsed.text.slice(0, 15000), 5));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <PanelShell icon={<IconFile />} title="File Analysis" subtitle="PDFs, Word docs & images — read right on your device">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv,.json,image/*"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="glass gradient-border glass-hover flex w-full flex-col items-center gap-3 rounded-[2rem] border-dashed px-6 py-12 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/30">
          {busy ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
          ) : (
            <IconFile className="h-7 w-7 text-purple-200" />
          )}
        </div>
        <div>
          <p className="font-semibold text-white/90">{busy ? "Reading your file…" : "Drop in a PDF, Word doc or image"}</p>
          <p className="mt-1 text-xs text-white/45">Everything is processed locally — your files never leave this device 🔒</p>
        </div>
      </button>

      {result && (
        <div className="glass mt-4 rounded-3xl p-5">
          <div className="flex items-center gap-3">
            {result.dataUrl ? (
              <IconImage className="h-5 w-5 text-pink-300" />
            ) : (
              <IconFile className="h-5 w-5 text-purple-300" />
            )}
            <p className="min-w-0 flex-1 truncate font-medium">{result.name}</p>
            <button onClick={() => { setResult(null); setSummary(""); }} className="text-white/40 hover:text-white">
              <IconX className="h-4 w-4" />
            </button>
          </div>
          {result.dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.dataUrl} alt={result.name} className="mt-3 max-h-72 w-full rounded-2xl object-cover" />
          )}
          {result.note && <p className="mt-3 text-sm text-amber-300/90">{result.note}</p>}
          {summary && (
            <div className="mt-4">
              <p className="gradient-text mb-2 text-sm font-bold">Sheetal's summary ✨</p>
              <div className="text-sm text-white/75">
                <RichText text={summary} />
              </div>
            </div>
          )}
          {result.text && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-white/40 hover:text-white/70">
                View extracted text ({result.text.length.toLocaleString()} chars)
              </summary>
              <pre className="glass-soft mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl p-3 text-xs text-white/60">
                {result.text.slice(0, 6000)}
              </pre>
            </details>
          )}
        </div>
      )}
    </PanelShell>
  );
}

/* ─────────────────────────────── create ─────────────────────────── */

export function CreatePanel() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<{ src: string; prompt: string; demo: boolean }[]>([]);

  const IDEAS = [
    "a purple nebula over the ocean",
    "a cozy café in the rain at night",
    "a lotus blooming under moonlight",
    "a futuristic Indian city at dawn",
  ];

  const generate = async (p?: string) => {
    const pr = (p ?? prompt).trim();
    if (!pr || busy) return;
    setBusy(true);
    setPrompt(pr);
    try {
      let src: string | null = null;
      let demo = true;
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: pr }),
        });
        const d = await res.json();
        if (d.image) {
          src = d.image;
          demo = false;
        }
      } catch { /* offline */ }
      if (!src) src = generateArt(pr);
      if (src) setGallery((g) => [{ src: src!, prompt: pr, demo }, ...g].slice(0, 12));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell icon={<IconImage />} title="Create Art" subtitle="Describe it — Sheetal paints it">
      <div className="glass rounded-3xl p-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="A dreamy sunset over the Himalayas…"
          className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/35"
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <p className="text-[11px] text-white/35">✨ AI image when an OpenAI key is set · dream-art offline</p>
          <button onClick={() => void generate()} disabled={!prompt.trim() || busy} className="btn-primary px-5 py-2 text-xs">
            {busy ? "Painting…" : "Generate 🎨"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {IDEAS.map((i) => (
          <button key={i} onClick={() => void generate(i)} className="btn-ghost px-3 py-1.5 text-[11px]">
            {i}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {gallery.map((g, i) => (
          <div key={i} className="glass glass-hover overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.src} alt={g.prompt} className="aspect-square w-full object-cover" />
            <div className="flex items-center gap-2 p-3">
              <p className="min-w-0 flex-1 truncate text-xs text-white/60">
                {g.prompt} {g.demo && <span className="text-amber-300/70">· dream-art</span>}
              </p>
              <a href={g.src} download={`sheetal-art-${i}.png`} className="btn-ghost flex h-8 w-8 items-center justify-center rounded-xl">
                <IconDownload className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

/* ────────────────────────────── settings ────────────────────────── */

const LANGS: { id: LangMode; label: string; hint: string }[] = [
  { id: "en", label: "English", hint: "Pure English" },
  { id: "hinglish", label: "Hinglish", hint: "Hindi + English mix" },
  { id: "hi", label: "हिंदी", hint: "शुद्ध हिंदी" },
];

export function SettingsPanel() {
  const store = useStore();
  const s = store.settings;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [favKey, setFavKey] = useState("");
  const [favVal, setFavVal] = useState("");
  const [sttOk, setSttOk] = useState(false);

  useEffect(() => {
    setSttOk(isSTTSupported());
    const load = () => setVoices(listVoices());
    load();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const testVoice = () => {
    speak(
      s.lang === "hi"
        ? "नमस्ते! मैं शीतल हूँ, आपकी अपनी साथी। 💜"
        : s.lang === "hinglish"
          ? "Hey! Main Sheetal hoon — tumhari apni companion. Kaisa laga mera voice?"
          : "Hey! I'm Sheetal, your personal companion. Do you like my voice?",
      { lang: ttsLang(s.lang), rate: s.rate, pitch: s.pitch, voiceName: s.voiceName }
    );
  };

  const downloadExport = () => {
    const blob = new Blob([store.exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sheetal-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <PanelShell icon={<IconGear />} title="Settings" subtitle="Tune Sheetal to be perfectly yours">
      {/* language */}
      <div className="glass rounded-3xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/85">
          🌐 Language / भाषा
        </p>
        <div className="grid grid-cols-3 gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => store.updateSettings({ lang: l.id })}
              className={`rounded-2xl border px-3 py-3 text-center transition ${
                s.lang === l.id
                  ? "border-purple-400/60 bg-gradient-to-b from-purple-500/30 to-pink-500/20 shadow-glow"
                  : "border-white/10 bg-white/5 hover:border-white/25"
              }`}
            >
              <p className="text-sm font-semibold">{l.label}</p>
              <p className="mt-0.5 text-[10px] text-white/45">{l.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* voice */}
      <div className="glass mt-4 rounded-3xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/85">
          <IconSpeaker className="h-4 w-4 text-pink-300" /> Voice
        </p>
        <Toggle
          on={s.autoSpeak}
          onChange={(v) => store.updateSettings({ autoSpeak: v })}
          label="Speak replies aloud"
          hint="Sheetal reads her messages in a warm voice"
        />
        <div className="mt-3">
          <label className="text-xs text-white/50">Voice</label>
          <select
            value={s.voiceName ?? ""}
            onChange={(e) => store.updateSettings({ voiceName: e.target.value || undefined })}
            className="field mt-1 w-full px-3 py-2.5 text-sm"
          >
            <option value="">Auto (best match)</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} — {v.lang}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50">Speed · {s.rate.toFixed(2)}×</label>
            <input type="range" min={0.6} max={1.6} step={0.05} value={s.rate}
              onChange={(e) => store.updateSettings({ rate: parseFloat(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-white/50">Warmth (pitch) · {s.pitch.toFixed(2)}</label>
            <input type="range" min={0.6} max={1.6} step={0.05} value={s.pitch}
              onChange={(e) => store.updateSettings({ pitch: parseFloat(e.target.value) })} className="w-full" />
          </div>
        </div>
        <button onClick={testVoice} className="btn-ghost mt-3 flex items-center gap-2 px-4 py-2 text-xs">
          <IconSpeaker className="h-4 w-4" /> Test her voice
        </button>
        <div className="mt-4 border-t border-white/10 pt-4">
          <Toggle
            on={s.wakeWord}
            onChange={(v) => store.updateSettings({ wakeWord: v })}
            label='Wake word — “Hey Sheetal”'
            hint={
              sttOk
                ? `Hands-free listening (${recogLang(s.lang)}) — keep this tab open`
                : "Voice input isn't supported in this browser (try Chrome/Edge)"
            }
          />
          {s.wakeWord && sttOk && (
            <p className="mt-2 flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-[11px] text-white/50">
              <IconWake className="h-4 w-4 flex-none text-purple-300" />
              Say “Hey Sheetal” then your command — e.g. “Hey Sheetal, what's the weather in Pune?”
            </p>
          )}
        </div>
      </div>

      {/* memory & privacy */}
      <div className="glass mt-4 rounded-3xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/85">
          <IconLock className="h-4 w-4 text-purple-300" /> Memory & Privacy
        </p>
        <Toggle
          on={s.memoryConsent}
          onChange={(v) => {
            store.updateSettings({ memoryConsent: v });
            store.setMemory((m) => ({ ...m, consent: v }));
          }}
          label="Remember me (with my permission)"
          hint="Name, favourites, birthdays & routines — encrypted on this device"
        />
        <Toggle
          on={s.encryptData}
          onChange={(v) => store.updateSettings({ encryptData: v })}
          label="Encrypt my data (AES-256)"
          hint="All stored data is encrypted with a device-only key"
        />

        {s.memoryConsent && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <input
                defaultValue={store.memory.name ?? ""}
                onBlur={(e) => store.setMemory((m) => ({ ...m, name: e.target.value.trim() || undefined }))}
                placeholder="Your name"
                className="field px-3 py-2.5 text-sm"
              />
              <input
                defaultValue={store.memory.birthday ?? ""}
                onBlur={(e) => store.setMemory((m) => ({ ...m, birthday: e.target.value.trim() || undefined }))}
                placeholder="Your birthday 🎂"
                className="field px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input value={favKey} onChange={(e) => setFavKey(e.target.value)} placeholder="favourite… (song)"
                className="field w-1/2 px-3 py-2.5 text-sm" />
              <input value={favVal} onChange={(e) => setFavVal(e.target.value)} placeholder="is… (Tum Hi Ho)"
                className="field w-1/2 px-3 py-2.5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && favKey.trim() && favVal.trim()) {
                    store.setMemory((m) => ({ ...m, favorites: { ...m.favorites, [favKey.trim().toLowerCase()]: favVal.trim() } }));
                    setFavKey(""); setFavVal("");
                  }
                }} />
              <button
                onClick={() => {
                  if (favKey.trim() && favVal.trim()) {
                    store.setMemory((m) => ({ ...m, favorites: { ...m.favorites, [favKey.trim().toLowerCase()]: favVal.trim() } }));
                    setFavKey(""); setFavVal("");
                  }
                }}
                className="btn-primary flex h-10 w-10 flex-none items-center justify-center rounded-2xl"
              >
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
            {(store.memory.name || store.memory.birthday || Object.keys(store.memory.favorites).length > 0 || store.memory.routines.length > 0) && (
              <div className="glass-soft rounded-2xl p-3 text-sm">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-white/40">She remembers 💜</p>
                {store.memory.name && <p className="text-white/75">· Name: <b>{store.memory.name}</b></p>}
                {store.memory.birthday && <p className="text-white/75">· Birthday: <b>{store.memory.birthday}</b> 🎂</p>}
                {Object.entries(store.memory.favorites).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2 text-white/75">
                    · Favourite {k}: <b>{v}</b>
                    <button
                      onClick={() => store.setMemory((m) => {
                        const f = { ...m.favorites };
                        delete f[k];
                        return { ...m, favorites: f };
                      })}
                      className="text-white/30 hover:text-pink-400"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  </p>
                ))}
                {store.memory.routines.map((r, i) => (
                  <p key={i} className="text-white/60">· {r}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* data controls */}
      <div className="glass mt-4 rounded-3xl p-5">
        <p className="mb-3 text-sm font-semibold text-white/85">🗄️ Your data</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadExport} className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-xs">
            <IconDownload className="h-4 w-4" /> Export everything (JSON)
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete ALL data — chats, notes, tasks, memories — forever?")) store.wipeAll();
            }}
            className="btn-ghost flex items-center gap-2 border-pink-400/40 px-4 py-2.5 text-xs text-pink-300"
          >
            <IconTrash className="h-4 w-4" /> Delete everything
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Privacy promise: your data lives only in this browser, AES-256 encrypted with a key that never leaves your
          device. Cloud AI (OpenAI) is used only if you add a key on the server — and only your chat text is sent.
        </p>
      </div>

      {/* about */}
      <div className="glass mt-4 rounded-3xl p-5 text-center">
        <p className="gradient-text font-bold">Sheetal Darling 💜</p>
        <p className="mt-1 text-xs text-white/45">v1.0 · Next.js + Tailwind · Whisper-class browser voice · GPT-ready</p>
      </div>
    </PanelShell>
  );
}

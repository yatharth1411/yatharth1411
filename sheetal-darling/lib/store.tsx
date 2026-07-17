"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type {
  CalEvent, ChatMessage, MemoryProfile, NoteItem, ReminderItem, Settings, TaskItem,
} from "./types";
import { uid } from "./tools";
import { encryptText, decryptText } from "./crypto";

const STORAGE_KEY = "sheetal_state_v1";

export interface Store {
  hydrated: boolean;
  messages: ChatMessage[];
  tasks: TaskItem[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  events: CalEvent[];
  memory: MemoryProfile;
  settings: Settings;

  addMessage: (m: Omit<ChatMessage, "id" | "ts"> & { id?: string }) => ChatMessage;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  addTask: (text: string) => TaskItem;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;

  addNote: (title: string, body: string) => NoteItem;
  updateNote: (id: string, patch: Partial<NoteItem>) => void;
  removeNote: (id: string) => void;

  addReminder: (text: string, at: number) => ReminderItem;
  removeReminder: (id: string) => void;

  addEvent: (title: string, date: string, time?: string) => CalEvent;
  removeEvent: (id: string) => void;

  setMemory: (fn: (m: MemoryProfile) => MemoryProfile) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  exportAll: () => string;
  wipeAll: () => void;

  /** subscribe to fired reminders; returns unsubscribe */
  onReminder: (cb: (r: ReminderItem) => void) => () => void;
}

const StoreCtx = createContext<Store | null>(null);

const DEFAULT_SETTINGS: Settings = {
  lang: "hinglish",
  autoSpeak: false,
  rate: 1,
  pitch: 1.08,
  wakeWord: false,
  memoryConsent: false,
  encryptData: true,
};

const DEFAULT_MEMORY: MemoryProfile = {
  favorites: {},
  birthdays: {},
  routines: [],
  consent: false,
};

interface Persisted {
  messages: ChatMessage[];
  tasks: TaskItem[];
  notes: NoteItem[];
  reminders: ReminderItem[];
  events: CalEvent[];
  memory: MemoryProfile;
  settings: Settings;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [memory, setMemoryState] = useState<MemoryProfile>(DEFAULT_MEMORY);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const reminderCbs = useRef(new Set<(r: ReminderItem) => void>());
  const remindersRef = useRef<ReminderItem[]>([]);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  /* load once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const json = await decryptText(raw);
          if (json) {
            const p = JSON.parse(json) as Partial<Persisted>;
            if (!cancelled) {
              setMessages((p.messages ?? []).slice(-200));
              setTasks(p.tasks ?? []);
              setNotes(p.notes ?? []);
              setReminders(p.reminders ?? []);
              setEvents(p.events ?? []);
              setMemoryState({ ...DEFAULT_MEMORY, ...(p.memory ?? {}) });
              setSettings({ ...DEFAULT_SETTINGS, ...(p.settings ?? {}) });
            }
          }
        }
      } catch {
        /* corrupted state — start fresh */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* persist (debounced, optionally encrypted) */
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const payload: Persisted = {
        messages: messages.slice(-200),
        tasks, notes, reminders, events,
        memory: settings.memoryConsent ? memory : DEFAULT_MEMORY,
        settings,
      };
      const plain = JSON.stringify(payload);
      void (settings.encryptData ? encryptText(plain) : Promise.resolve(plain)).then((out) => {
        try {
          localStorage.setItem(STORAGE_KEY, out);
        } catch {
          /* storage full — drop oldest messages */
          try {
            const slim = JSON.stringify({ ...payload, messages: payload.messages.slice(-50) });
            localStorage.setItem(STORAGE_KEY, slim);
          } catch { /* give up quietly */ }
        }
      });
    }, 350);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [hydrated, messages, tasks, notes, reminders, events, memory, settings]);

  /* reminder engine */
  useEffect(() => {
    const iv = window.setInterval(() => {
      const now = Date.now();
      const due = remindersRef.current.filter((r) => !r.fired && r.at <= now);
      if (!due.length) return;
      due.forEach((r) => reminderCbs.current.forEach((cb) => cb(r)));
      setReminders((rs) => rs.map((r) => (due.some((d) => d.id === r.id) ? { ...r, fired: true } : r)));
    }, 5000);
    return () => window.clearInterval(iv);
  }, []);

  const addMessage = useCallback<Store["addMessage"]>((m) => {
    const msg: ChatMessage = { id: m.id ?? uid(), ts: Date.now(), ...m };
    setMessages((ms) => [...ms, msg]);
    return msg;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  const addTask = useCallback((text: string) => {
    const t: TaskItem = { id: uid(), text, done: false, createdAt: Date.now() };
    setTasks((ts) => [t, ...ts]);
    return t;
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const addNote = useCallback((title: string, body: string) => {
    const n: NoteItem = { id: uid(), title, body, updatedAt: Date.now() };
    setNotes((ns) => [n, ...ns]);
    return n;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<NoteItem>) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((ns) => ns.filter((n) => n.id !== id));
  }, []);

  const addReminder = useCallback((text: string, at: number) => {
    const r: ReminderItem = { id: uid(), text, at, fired: false };
    setReminders((rs) => [...rs, r].sort((a, b) => a.at - b.at));
    return r;
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((rs) => rs.filter((r) => r.id !== id));
  }, []);

  const addEvent = useCallback((title: string, date: string, time?: string) => {
    const e: CalEvent = { id: uid(), title, date, time };
    setEvents((es) => [...es, e].sort((a, b) => a.date.localeCompare(b.date)));
    return e;
  }, []);

  const removeEvent = useCallback((id: string) => {
    setEvents((es) => es.filter((e) => e.id !== id));
  }, []);

  const setMemory = useCallback((fn: (m: MemoryProfile) => MemoryProfile) => {
    setMemoryState((m) => fn(m));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const exportAll = useCallback(() => {
    return JSON.stringify({ messages, tasks, notes, reminders, events, memory, settings }, null, 2);
  }, [messages, tasks, notes, reminders, events, memory, settings]);

  const wipeAll = useCallback(() => {
    setMessages([]); setTasks([]); setNotes([]); setReminders([]); setEvents([]);
    setMemoryState(DEFAULT_MEMORY);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  const onReminder = useCallback((cb: (r: ReminderItem) => void) => {
    reminderCbs.current.add(cb);
    return () => {
      reminderCbs.current.delete(cb);
    };
  }, []);

  const value = useMemo<Store>(
    () => ({
      hydrated, messages, tasks, notes, reminders, events, memory, settings,
      addMessage, updateMessage, clearMessages,
      addTask, toggleTask, removeTask,
      addNote, updateNote, removeNote,
      addReminder, removeReminder,
      addEvent, removeEvent,
      setMemory, updateSettings, exportAll, wipeAll, onReminder,
    }),
    [
      hydrated, messages, tasks, notes, reminders, events, memory, settings,
      addMessage, updateMessage, clearMessages, addTask, toggleTask, removeTask,
      addNote, updateNote, removeNote, addReminder, removeReminder, addEvent, removeEvent,
      setMemory, updateSettings, exportAll, wipeAll, onReminder,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
}

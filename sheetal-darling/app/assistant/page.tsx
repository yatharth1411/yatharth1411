"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Background from "@/components/Background";
import Chat from "@/components/Chat";
import Sidebar from "@/components/Sidebar";
import {
  CalendarPanel, CreatePanel, FilesPanel, NewsPanel, NotesPanel,
  RemindersPanel, SettingsPanel, TasksPanel, WeatherPanel,
} from "@/components/panels";
import { IconBack, IconHeart, IconSpeaker, IconWake, IconX } from "@/components/icons";
import { StoreProvider, useStore } from "@/lib/store";
import { useConversation } from "@/lib/useConversation";
import { greeting, ack } from "@/lib/persona";
import {
  isSTTSupported, matchWake, recogLang, speak, startRecognition, stripWake, ttsLang,
  type RecogHandle,
} from "@/lib/speech";
import { parseFile } from "@/lib/fileparse";
import type { LangMode, PanelId } from "@/lib/types";

const LANG_CYCLE: LangMode[] = ["hinglish", "en", "hi"];
const LANG_LABEL: Record<LangMode, string> = { hinglish: "HIN+EN", en: "EN", hi: "हिं" };

function Header({
  panel, setPanel, wakeOn, wakeActive,
}: {
  panel: PanelId;
  setPanel: (p: PanelId) => void;
  wakeOn: boolean;
  wakeActive: boolean;
}) {
  const store = useStore();
  const s = store.settings;

  return (
    <header className="glass mx-3 mt-3 flex flex-none items-center gap-3 rounded-3xl px-4 py-3">
      <Link href="/" className="btn-ghost flex h-9 w-9 items-center justify-center rounded-2xl" title="Home">
        <IconBack className="h-4 w-4" />
      </Link>
      <button onClick={() => setPanel("chat")} className="flex min-w-0 items-center gap-3 text-left">
        <div className="relative flex-none">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-sky-400 shadow-glow">
            <IconHeart className="h-5 w-5 text-white heart-beat" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#140b24] ${
              wakeActive ? "bg-pink-400" : "bg-emerald-400"
            }`}
          />
        </div>
        <div className="min-w-0">
          <p className="gradient-text truncate font-bold leading-tight">Sheetal Darling</p>
          <p className="truncate text-[11px] text-white/50">
            {wakeActive
              ? "listening to your command… 🎙️"
              : wakeOn
                ? 'say "Hey Sheetal" anytime'
                : store.memory.consent && store.memory.name
                  ? `with ${store.memory.name} 💜`
                  : "your caring companion"}
          </p>
        </div>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {wakeOn && (
          <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] sm:flex ${
            wakeActive ? "bg-pink-500/25 text-pink-200" : "bg-white/5 text-white/50"
          }`}>
            <IconWake className={`h-3.5 w-3.5 ${wakeActive ? "animate-pulse" : ""}`} />
            {wakeActive ? "listening" : "wake word on"}
          </span>
        )}
        <button
          onClick={() => {
            const next = LANG_CYCLE[(LANG_CYCLE.indexOf(s.lang) + 1) % LANG_CYCLE.length];
            store.updateSettings({ lang: next });
          }}
          title="Switch language"
          className="btn-ghost hidden h-9 items-center rounded-2xl px-3 text-[11px] font-bold sm:flex"
        >
          {LANG_LABEL[s.lang]}
        </button>
        <button
          onClick={() => store.updateSettings({ autoSpeak: !s.autoSpeak })}
          title={s.autoSpeak ? "Mute Sheetal's voice" : "Let Sheetal speak"}
          className={`flex h-9 w-9 items-center justify-center rounded-2xl transition ${
            s.autoSpeak ? "bg-gradient-to-br from-purple-500/60 to-pink-500/50 text-white shadow-glow" : "btn-ghost text-white/60"
          }`}
        >
          {s.autoSpeak ? <IconSpeaker className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
        </button>
        <button
          onClick={() => setPanel("settings")}
          title="Settings"
          className={`btn-ghost hidden h-9 w-9 items-center justify-center rounded-2xl sm:flex ${panel === "settings" ? "border-purple-400/50" : ""}`}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}

function Shell() {
  const store = useStore();
  const convo = useConversation();
  const [panel, setPanel] = useState<PanelId>("chat");
  const [wakeActive, setWakeActive] = useState(false);
  const convoRef = useRef(convo);
  useEffect(() => {
    convoRef.current = convo;
  });

  /* seed greeting once */
  useEffect(() => {
    if (store.hydrated && store.messages.length === 0) {
      const g = greeting(
        store.settings.lang,
        store.memory.consent ? store.memory.name : undefined
      );
      store.addMessage({ role: "assistant", content: g, reveal: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.hydrated]);

  /* reminder announcements */
  useEffect(() => {
    return store.onReminder((r) => convoRef.current.announceReminder(r));
  }, [store]);

  /* wake word loop */
  const [sttOk, setSttOk] = useState(false);
  useEffect(() => {
    setSttOk(isSTTSupported());
  }, []);
  const wakeOn = store.settings.wakeWord && sttOk;
  useEffect(() => {
    if (!wakeOn) return;
    let stopped = false;
    let mode: "wake" | "cmd" = "wake";
    let handle: RecogHandle | null = null;
    let cmdTimer: number | null = null;

    const start = () => {
      if (stopped) return;
      handle = startRecognition({
        lang: recogLang(store.settings.lang),
        continuous: true,
        interim: false,
        onResult: (text, isFinal) => {
          if (!isFinal) return;
          if (mode === "wake") {
            if (matchWake(text)) {
              const rest = stripWake(text);
              if (rest.length > 2) {
                void convoRef.current.send(rest);
              } else {
                mode = "cmd";
                setWakeActive(true);
                const s = store.settings;
                speak(ack(s.lang), { lang: ttsLang(s.lang), rate: s.rate, pitch: s.pitch, voiceName: s.voiceName });
                if (cmdTimer) window.clearTimeout(cmdTimer);
                cmdTimer = window.setTimeout(() => {
                  mode = "wake";
                  setWakeActive(false);
                }, 9000);
              }
            }
          } else {
            mode = "wake";
            setWakeActive(false);
            if (cmdTimer) window.clearTimeout(cmdTimer);
            void convoRef.current.send(text);
          }
        },
        onEnd: () => {
          if (!stopped) window.setTimeout(start, 700);
        },
      });
    };
    start();
    return () => {
      stopped = true;
      if (cmdTimer) window.clearTimeout(cmdTimer);
      handle?.stop();
      setWakeActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wakeOn, store.settings.lang]);

  const askFromPanel = (text: string) => {
    setPanel("chat");
    void convoRef.current.send(text);
  };

  const sendFileToChat = async (f: File) => {
    setPanel("chat");
    const parsed = await parseFile(f);
    await convoRef.current.send("", {
      name: parsed.name,
      mime: parsed.mime,
      dataUrl: parsed.dataUrl,
      text: parsed.text,
      note: parsed.note,
    });
  };

  return (
    <div className="relative flex h-dvh flex-col">
      <Background />
      <Header panel={panel} setPanel={setPanel} wakeOn={wakeOn} wakeActive={wakeActive} />
      <div className="flex min-h-0 flex-1">
        <Sidebar current={panel} onSelect={setPanel} />
        <main className="m-3 min-w-0 flex-1">
          <div className="glass h-full min-h-0 overflow-hidden rounded-3xl pb-16 md:pb-0">
            {panel === "chat" && <Chat onSend={convo.send} typing={convo.typing} />}
            {panel === "notes" && <NotesPanel />}
            {panel === "tasks" && <TasksPanel />}
            {panel === "reminders" && <RemindersPanel />}
            {panel === "calendar" && <CalendarPanel />}
            {panel === "weather" && <WeatherPanel />}
            {panel === "news" && <NewsPanel onAsk={askFromPanel} />}
            {panel === "files" && <FilesPanel onSendFile={sendFileToChat} />}
            {panel === "create" && <CreatePanel />}
            {panel === "settings" && <SettingsPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

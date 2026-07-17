"use client";

import React from "react";
import { useStore } from "@/lib/store";
import type { PanelId } from "@/lib/types";
import {
  IconBell, IconCal, IconChat, IconCloud, IconFile, IconGear, IconImage, IconNews, IconNote, IconTask,
} from "./icons";

const ITEMS: { id: PanelId; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: "chat", label: "Chat", Icon: IconChat },
  { id: "notes", label: "Notes", Icon: IconNote },
  { id: "tasks", label: "Tasks", Icon: IconTask },
  { id: "reminders", label: "Reminders", Icon: IconBell },
  { id: "calendar", label: "Calendar", Icon: IconCal },
  { id: "weather", label: "Weather", Icon: IconCloud },
  { id: "news", label: "News", Icon: IconNews },
  { id: "files", label: "Files", Icon: IconFile },
  { id: "create", label: "Create", Icon: IconImage },
  { id: "settings", label: "Settings", Icon: IconGear },
];

export default function Sidebar({
  current, onSelect,
}: {
  current: PanelId;
  onSelect: (p: PanelId) => void;
}) {
  const store = useStore();
  const pendingTasks = store.tasks.filter((t) => !t.done).length;
  const upcomingReminders = store.reminders.filter((r) => !r.fired).length;

  const badge = (id: PanelId): number => {
    if (id === "tasks") return pendingTasks;
    if (id === "reminders") return upcomingReminders;
    return 0;
  };

  return (
    <>
      {/* desktop rail */}
      <aside className="glass m-3 mr-0 hidden w-56 flex-none flex-col rounded-3xl p-3 md:flex">
        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Your world
        </p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {ITEMS.map(({ id, label, Icon }) => {
            const active = current === id;
            const b = badge(id);
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-gradient-to-r from-purple-500/35 to-pink-500/25 text-white shadow-glow"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? "text-pink-300" : "text-white/45 group-hover:text-purple-300"}`} />
                <span className="font-medium">{label}</span>
                {b > 0 && (
                  <span className="ml-auto rounded-full bg-pink-500/80 px-2 py-0.5 text-[10px] font-bold text-white">
                    {b}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="glass-soft mt-2 rounded-2xl p-3 text-[11px] leading-relaxed text-white/45">
          💡 Tip: say <span className="font-semibold text-white/80">“Hey Sheetal”</span> — she's always listening (when you enable it).
        </div>
      </aside>

      {/* mobile bottom bar */}
      <nav className="glass fixed inset-x-3 bottom-3 z-30 flex items-center gap-1 overflow-x-auto rounded-3xl px-2 py-2 md:hidden">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = current === id;
          const b = badge(id);
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`relative flex flex-none flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[9px] transition ${
                active ? "bg-gradient-to-b from-purple-500/40 to-pink-500/25 text-white" : "text-white/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-pink-300" : ""}`} />
              {label}
              {b > 0 && (
                <span className="absolute right-1 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold text-white">
                  {b}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}

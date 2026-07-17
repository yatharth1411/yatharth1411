export type Role = "user" | "assistant";
export type MessageKind = "text" | "image" | "file";
export type LangMode = "en" | "hinglish" | "hi";

export interface Attachment {
  name: string;
  mime: string;
  dataUrl?: string;
  text?: string;
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  ts: number;
  kind?: MessageKind;
  attachment?: Attachment;
  /** true while the typewriter animation is still revealing this message */
  reveal?: boolean;
}

export interface MemoryProfile {
  name?: string;
  birthday?: string;
  favorites: Record<string, string>;
  birthdays: Record<string, string>;
  routines: string[];
  consent: boolean;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export interface ReminderItem {
  id: string;
  text: string;
  at: number;
  fired: boolean;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
}

export interface Settings {
  lang: LangMode;
  autoSpeak: boolean;
  voiceName?: string;
  rate: number;
  pitch: number;
  wakeWord: boolean;
  memoryConsent: boolean;
  encryptData: boolean;
}

export type PanelId =
  | "chat"
  | "notes"
  | "tasks"
  | "reminders"
  | "calendar"
  | "weather"
  | "news"
  | "files"
  | "create"
  | "settings";

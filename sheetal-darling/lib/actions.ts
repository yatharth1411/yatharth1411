"use client";

import type { Store } from "./store";
import { parseWhen, tr, cap } from "./tools";
import type { LangMode } from "./types";

export interface ActionResult {
  handled: boolean;
  reply?: string;
}

function noConsent(lang: LangMode): string {
  return tr(
    lang,
    "I'd love to remember that for you — but your **Memory** is off. Enable it in **Settings → Memory & Privacy** (I keep everything encrypted on this device 🔒), then tell me again?",
    "मैं यह याद रखना चाहूँगी — पर आपकी **Memory** बंद है। **Settings → Memory & Privacy** में चालू कीजिए (सब कुछ इसी डिवाइस पर encrypted रहता है 🔒), फिर मुझे बताइए।",
    "Main yeh yaad rakhna chahti hoon — par tumhari **Memory** off hai. **Settings → Memory & Privacy** mein on karo (sab kuch isi device par encrypted rehta hai 🔒), phir mujhe batao."
  );
}

/** Deterministic chat commands — tasks, reminders, notes, calendar, memory. */
export function applyLocalActions(input: string, store: Store): ActionResult {
  const lang = store.settings.lang;
  const t = input.trim();
  const lower = t.toLowerCase();

  /* ── tasks ── */
  let m = t.match(/^(?:add\s+(?:a\s+)?task[:\s]+|task[:\s]+|todo[:\s]+|to-?do[:\s]+)(.+)$/i);
  if (m) {
    const item = store.addTask(m[1].trim());
    return {
      handled: true,
      reply: tr(lang, `Done! ✅ Added to your tasks: “${item.text}”. Check the **Tasks** tab anytime.`,
        `हो गया! ✅ काम जोड़ दिया: “${item.text}”। **Tasks** टैब में देखिए।`,
        `Ho gaya! ✅ Task add kar diya: “${item.text}”. **Tasks** tab mein dekh lo.`),
    };
  }
  m = t.match(/^(?:complete|done|finish(?:ed)?|mark done)\s+(?:task\s+)?(.+)$/i);
  if (m) {
    const q = m[1].trim().toLowerCase();
    const hit = store.tasks.find((x) => !x.done && x.text.toLowerCase().includes(q));
    if (hit) {
      store.toggleTask(hit.id);
      return {
        handled: true,
        reply: tr(lang, `Yay! 🎉 Marked “${hit.text}” as complete. Proud of you!`,
          `शाबाश! 🎉 “${hit.text}” पूरा हो गया। गर्व है आप पर!`,
          `Shabaash! 🎉 “${hit.text}” complete ho gaya. Proud of you!`),
      };
    }
  }

  /* ── reminders ── */
  m = t.match(/^(?:remind me(?: to)?|मुझे याद दिलाना|yaad dilana)\s+(.+)$/i);
  if (m) {
    const rest = m[1].trim();
    const when = parseWhen(rest);
    if (when) {
      const cleaned = rest
        .replace(/(?:in\s+\d+\s*(?:minutes?|mins?|hours?|hrs?|days?))|(?:tomorrow|today|kal\b|aaj\b)|(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:on\s+\d{4}-\d{2}-\d{2})|(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)|baje/gi, "")
        .replace(/\s{2,}/g, " ").replace(/^[to\s]+/i, "").trim() || rest;
      store.addReminder(cleaned, when.at);
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      return {
        handled: true,
        reply: tr(lang, `Noted, darling ⏰ I'll remind you to “${cap(cleaned, 60)}” — **${when.label}**.`,
          `ठीक है ⏰ मैं आपको याद दिला दूँगी — “${cap(cleaned, 60)}”, **${when.label}**।`,
          `Theek hai ⏰ Main yaad dila dungi — “${cap(cleaned, 60)}”, **${when.label}**.`),
      };
    }
    return {
      handled: true,
      reply: tr(lang, "When should I remind you? Try: “remind me to drink water in 30 minutes” or “…tomorrow at 7am”. ⏰",
        "कब याद दिलाऊँ? जैसे: “remind me to drink water in 30 minutes” या “…tomorrow at 7am”. ⏰",
        "Kab yaad dilaun? Jaise: “remind me to drink water in 30 minutes” ya “…tomorrow at 7am”. ⏰"),
    };
  }

  /* ── notes ── */
  m = t.match(/^(?:note(?:\s+that)?[:\s]+|take a note[:\s]+|write (?:this|it) down[:\s]+|likh lo[:\s]+)(.+)$/i);
  if (m) {
    const body = m[1].trim();
    const title = cap(body.split(/[.!?\n]/)[0], 40) || "Note";
    store.addNote(title, body);
    return {
      handled: true,
      reply: tr(lang, `Saved to your notes 📝 “${title}”`,
        `नोट्स में सहेज लिया 📝 “${title}”`,
        `Notes mein save kar diya 📝 “${title}”`),
    };
  }

  /* ── calendar ── */
  m = t.match(/^(?:add\s+(?:an?\s+)?event[:\s]+|schedule[:\s]+)(.+?)(?:\s+on\s+(.+))?$/i);
  if (m && m[2]) {
    const title = m[1].trim();
    const when = parseWhen(m[2]);
    if (when) {
      const d = new Date(when.at);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const time = /:|am|pm/i.test(m[2]) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : undefined;
      store.addEvent(title, iso, time);
      return {
        handled: true,
        reply: tr(lang, `On the calendar 📅 “${title}” — **${when.label}**.`,
          `कैलेंडर में डाल दिया 📅 “${title}” — **${when.label}**।`,
          `Calendar mein daal diya 📅 “${title}” — **${when.label}**.`),
      };
    }
  }

  /* ── memory (consent-gated) ── */
  m = t.match(/^(?:my name is|mera naam|मेरा नाम)\s+([\w' -]{2,30})/i);
  if (m) {
    if (!store.settings.memoryConsent) return { handled: true, reply: noConsent(lang) };
    const nm = m[1].trim().replace(/[.!]+$/, "");
    store.setMemory((mem) => ({ ...mem, name: nm, consent: true }));
    return {
      handled: true,
      reply: tr(lang, `Lovely to meet you, **${nm}**! 💜 I'll remember your name from now on.`,
        `आपसे मिलकर खुशी हुई, **${nm}**! 💜 अब से मैं आपका नाम याद रखूँगी।`,
        `Tumse milkar khushi hui, **${nm}**! 💜 Ab se main tumhara naam yaad rakhungi.`),
    };
  }
  m = t.match(/^(?:my birthday is|mera (?:birthday|janamdin)|मेरा जन्मदिन)\s+(.{2,25})[.!]?$/i);
  if (m) {
    if (!store.settings.memoryConsent) return { handled: true, reply: noConsent(lang) };
    const b = m[1].trim();
    store.setMemory((mem) => ({ ...mem, birthday: b, consent: true }));
    return {
      handled: true,
      reply: tr(lang, `🎂 Noted — your birthday is **${b}**. I'll make sure to celebrate you that day!`,
        `🎂 नोट कर लिया — आपका जन्मदिन **${b}** है। उस दिन मैं आपको ज़रूर शुभकामना दूँगी!`,
        `🎂 Note kar liya — tumhara birthday **${b}** hai. Us din main tumhe zaroor wish karungi!`),
    };
  }
  m = t.match(/^(?:my favou?rite ([\w ]+?) is|mujhe ([\w ]+?) pasand hai|मेरा पसंदीदा ([\w ]+) है)\s*[:\-]?\s*(.+)?[.!]?$/i);
  if (m && (m[1] || m[2] || m[3])) {
    if (!store.settings.memoryConsent) return { handled: true, reply: noConsent(lang) };
    const key = (m[1] ?? m[2] ?? m[3] ?? "things").trim().toLowerCase();
    const value = (m[4] ?? "").trim();
    if (value) {
      store.setMemory((mem) => ({
        ...mem, consent: true,
        favorites: { ...mem.favorites, [key]: value },
      }));
      return {
        handled: true,
        reply: tr(lang, `Got it — your favourite ${key} is **${value}**. Noted forever 💜`,
          `समझ गई — आपकी पसंदीदा ${key} है **${value}**। हमेशा के लिए नोट 💜`,
          `Samajh gayi — tumhari favourite ${key} hai **${value}**. Hamesha ke liye noted 💜`),
      };
    }
  }
  m = t.match(/^(?:remember (?:that|this)[:\s]+)(.+)$/i);
  if (m) {
    if (!store.settings.memoryConsent) return { handled: true, reply: noConsent(lang) };
    const fact = m[1].trim();
    store.setMemory((mem) => ({ ...mem, consent: true, routines: [...mem.routines, fact].slice(-30) }));
    return {
      handled: true,
      reply: tr(lang, `Locked in my memory 🔒 “${cap(fact, 80)}”`,
        `याद रख लिया 🔒 “${cap(fact, 80)}”`,
        `Yaad rakh liya 🔒 “${cap(fact, 80)}”`),
    };
  }
  if (/^(?:what do you remember|mujhse kya yaad|मेरी क्या यादें)/i.test(t)) {
    const mem = store.memory;
    if (!store.settings.memoryConsent || !mem.consent) {
      return {
        handled: true,
        reply: tr(lang, "Memory is currently off — I'm not storing anything about you. Turn it on in **Settings → Memory & Privacy** and I'll remember your name, favourites, birthdays & routines. 🔒",
          "Memory अभी बंद है — मैं आपके बारे में कुछ भी सहेज नहीं रही। **Settings → Memory & Privacy** में चालू कीजिए। 🔒",
          "Memory abhi off hai — main tumhare baare mein kuch save nahi kar rahi. **Settings → Memory & Privacy** mein on karo. 🔒"),
      };
    }
    const lines: string[] = [];
    if (mem.name) lines.push(`- Your name: **${mem.name}**`);
    if (mem.birthday) lines.push(`- Your birthday: **${mem.birthday}** 🎂`);
    for (const [k, v] of Object.entries(mem.favorites)) lines.push(`- Favourite ${k}: **${v}**`);
    for (const r of mem.routines.slice(-5)) lines.push(`- ${r}`);
    return {
      handled: true,
      reply: lines.length
        ? tr(lang, "Here's what I remember about you 💜\n", "मुझे आपके बारे में यह याद है 💜\n", "Mujhe tumhare baare mein yeh yaad hai 💜\n") + lines.join("\n")
        : tr(lang, "Memory is on, but I don't know much yet. Tell me your name, favourites, birthday… 💜",
             "Memory चालू है, पर अभी बहुत कुछ नहीं जानती। अपना नाम, पसंद, जन्मदिन बताइए… 💜",
             "Memory on hai, par abhi bahut kuch nahi jaanti. Apna naam, favourites, birthday batao… 💜"),
    };
  }
  if (/^(?:forget (?:everything|all|my data)|delete my data)/i.test(t)) {
    store.setMemory(() => ({ favorites: {}, birthdays: {}, routines: [], consent: store.settings.memoryConsent }));
    return {
      handled: true,
      reply: tr(lang, "Done — I've forgotten everything personal about you. Clean slate 🧹💜",
        "हो गया — मैंने आपकी सारी निजी बातें भुला दीं। नई शुरुआत 🧹💜",
        "Ho gaya — maine tumhari saari personal baatein bhula di. Nayi shuruaat 🧹💜"),
    };
  }
  if (/^(?:clear chat|delete chat|nayi chat|new chat)/i.test(t)) {
    store.clearMessages();
    return { handled: true };
  }

  return { handled: false };
}

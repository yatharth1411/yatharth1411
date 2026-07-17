"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { applyLocalActions } from "./actions";
import { brainReply } from "./localBrain";
import { speak, ttsLang } from "./speech";
import { tr, cap } from "./tools";
import { generateArt } from "./artgen";
import { summarizeText } from "./summarize";
import type { Attachment, ReminderItem } from "./types";

async function postChat(messages: { role: string; content: string }[], lang: string, memory: unknown) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, lang, memory }),
  });
  if (!res.ok) throw new Error("chat api failed");
  return (await res.json()) as { text: string; source: string };
}

export function useConversation() {
  const store = useStore();
  const [typing, setTyping] = useState(false);
  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  });

  const speakOut = useCallback((text: string) => {
    const s = storeRef.current.settings;
    if (s.autoSpeak) {
      speak(text, { lang: ttsLang(s.lang), rate: s.rate, pitch: s.pitch, voiceName: s.voiceName });
    }
  }, []);

  const localBrainReply = useCallback((input: string) => {
    const s = storeRef.current;
    return brainReply(input, { lang: s.settings.lang, memory: s.memory, now: new Date() });
  }, []);

  /** weather / news / search / image — live smart intents */
  const trySmartIntents = useCallback(async (input: string): Promise<{ handled: boolean; reply?: string; image?: string }> => {
    const s = storeRef.current;
    const lang = s.settings.lang;
    const t = input.trim();

    // image generation
    let m = t.match(/(?:generate|create|draw|make|banao|बनाओ)\s+(?:an?\s+|ek\s+)?(?:image|picture|photo|art|painting|wallpaper)\s+(?:of|about|for|on)?\s*(.+)/i);
    if (m && m[1]) {
      const prompt = m[1].trim();
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (data.image) {
          return {
            handled: true,
            image: data.image,
            reply: tr(lang, `Here's your artwork, darling 🎨 “${cap(prompt, 60)}” — made just for you.`,
              `यह रहा आपका चित्र 🎨 “${cap(prompt, 60)}” — सिर्फ़ आपके लिए।`,
              `Yeh raha tumhara artwork 🎨 “${cap(prompt, 60)}” — sirf tumhare liye.`),
          };
        }
      } catch { /* fall through to local art */ }
      const art = generateArt(prompt);
      if (art) {
        return {
          handled: true,
          image: art,
          reply: tr(lang, `Here's your dream-art 🎨 “${cap(prompt, 60)}”. (Offline mode — add an OpenAI key for photoreal images.)`,
            `यह रहा आपका dream-art 🎨 “${cap(prompt, 60)}”। (ऑफ़लाइन मोड — photoreal images के लिए OpenAI key जोड़ें।)`,
            `Yeh raha tumhara dream-art 🎨 “${cap(prompt, 60)}”. (Offline mode — photoreal ke liye OpenAI key add karo.)`),
        };
      }
    }

    // weather
    m = t.match(/weather(?:\s+(?:in|at|for|of))?\s+([a-zA-Z\u0900-\u097F .]+?)\??$/i) || t.match(/^(?:mausam|मौसम)(?:\s+([a-zA-Z .]+))?\??$/i);
    if (m) {
      const city = (m[1] ?? "").trim() || "Delhi";
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const w = await res.json();
        if (w && typeof w.temp === "number") {
          const demo = w.demo ? tr(lang, " _(demo data — add an OpenWeather key for live skies)_", " _(डेमो डेटा)_", " _(demo data)_") : "";
          return {
            handled: true,
            reply: tr(lang,
              `Weather in **${w.city}** right now: **${Math.round(w.temp)}°C**, ${w.desc} ${w.icon}\n- Feels like: ${Math.round(w.feels)}°C\n- Humidity: ${w.humidity}% · Wind: ${w.wind} km/h${demo}`,
              `**${w.city}** का मौसम: **${Math.round(w.temp)}°C**, ${w.desc} ${w.icon}\n- महसूस: ${Math.round(w.feels)}°C\n- नमी: ${w.humidity}% · हवा: ${w.wind} km/h${demo}`,
              `**${w.city}** ka mausam: **${Math.round(w.temp)}°C**, ${w.desc} ${w.icon}\n- Feels like: ${Math.round(w.feels)}°C\n- Humidity: ${w.humidity}% · Wind: ${w.wind} km/h${demo}`),
          };
        }
      } catch { /* fall through */ }
      return {
        handled: true,
        reply: tr(lang, "I couldn't reach the weather service just now — try the **Weather** tab in a moment. 🌦️",
          "मौसम सेवा अभी नहीं मिल पा रही — थोड़ी देर में **Weather** टैब आज़माइए। 🌦️",
          "Weather service abhi nahi mil pa rahi — thodi der mein **Weather** tab try karo. 🌦️"),
      };
    }

    // news
    if (/(^|\s)(news|headlines|khabar|khabren|खबर|समाचार)(\s|$)/i.test(t)) {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        if (data.items?.length) {
          const lines = data.items.slice(0, 5).map((n: { title: string }, i: number) => `${i + 1}. ${n.title}`);
          return {
            handled: true,
            reply: tr(lang, "Here are today's top stories 📰\n", "आज की बड़ी खबरें 📰\n", "Aaj ki top khabrein 📰\n") +
              lines.join("\n") +
              tr(lang, "\n\nOpen the **News** tab for links and more. Want me to summarise any of these?",
                 "\n\nलिंक और अधिक खबरों के लिए **News** टैब देखिए।",
                 "\n\nLinks ke liye **News** tab dekho. Kisi ka saar chahiye?"),
          };
        }
      } catch { /* fall through */ }
      return { handled: true, reply: tr(lang, "News is being shy right now — try the **News** tab shortly. 📰", "खबरें अभी नहीं मिल पा रहीं — थोड़ी देर में **News** टैब देखिए। 📰", "Khabrein abhi nahi mil pa rahi — thodi der mein **News** tab dekho. 📰") };
    }

    // smart search
    m = t.match(/^(?:search(?:\s+(?:for|the|web))?[:\s]+|google[:\s]+|look up[:\s]+|find[:\s]+|khojo[:\s]+|खोजो[:\s]+)(.{2,})$/i);
    if (m) {
      const q = m[1].replace(/\?+$/, "").trim();
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        const parts: string[] = [];
        if (d.abstract) parts.push(d.abstract);
        if (d.heading && !d.abstract) parts.push(`**${d.heading}**`);
        if (d.related?.length) {
          parts.push(tr(lang, "Related:", "संबंधित:", "Related:"));
          for (const r of d.related.slice(0, 3)) parts.push(`- ${r.text}`);
        }
        parts.push(`🔗 [Web results](https://duckduckgo.com/?q=${encodeURIComponent(q)})`);
        return {
          handled: true,
          reply: parts.length > 1
            ? parts.join("\n")
            : tr(lang, `I couldn't find a quick answer, but here's a search link:\n🔗 [${q}](https://duckduckgo.com/?q=${encodeURIComponent(q)})`,
                 `जल्दी जवाब नहीं मिला, पर यह लिंक देखिए:\n🔗 [${q}](https://duckduckgo.com/?q=${encodeURIComponent(q)})`,
                 `Quick answer nahi mila, par yeh link dekho:\n🔗 [${q}](https://duckduckgo.com/?q=${encodeURIComponent(q)})`),
        };
      } catch {
        return {
          handled: true,
          reply: `🔗 [Search: ${q}](https://duckduckgo.com/?q=${encodeURIComponent(q)})`,
        };
      }
    }

    return { handled: false };
  }, []);

  const send = useCallback(
    async (text: string, attachment?: Attachment) => {
      const s = storeRef.current;
      const content = text.trim();

      if (!content && !attachment) return;

      // user message
      s.addMessage({
        role: "user",
        content: content || (attachment ? `📎 ${attachment.name}` : ""),
        kind: attachment ? (attachment.dataUrl ? "image" : "file") : "text",
        attachment,
      });

      setTyping(true);
      const lang = s.settings.lang;

      try {
        /* 1. deterministic local actions (tasks, reminders, memory…) */
        if (content && !attachment) {
          const act = applyLocalActions(content, s);
          if (act.handled) {
            if (act.reply) {
              const msg = s.addMessage({ role: "assistant", content: act.reply, reveal: true });
              speakOut(act.reply);
              void msg;
            }
            return;
          }
        }

        /* 2. attachment analysis */
        if (attachment) {
          if (attachment.text) {
            const docText = attachment.text.slice(0, 12000);
            const question = content || tr(lang, "Please analyze and summarize this file.", "इस फ़ाइल का विश्लेषण और सार दीजिए।", "Is file ka analysis aur summary do.");
            try {
              const r = await postChat(
                [{ role: "user", content: `${question}\n\nDocument (${attachment.name}):\n${docText}` }],
                lang, s.memory
              );
              s.addMessage({ role: "assistant", content: r.text, reveal: true });
              speakOut(r.text);
            } catch {
              const summary = `📄 **${attachment.name}**\n\n` + summarizeText(docText, 5);
              s.addMessage({ role: "assistant", content: summary, reveal: true });
              speakOut(summary);
            }
          } else if (attachment.dataUrl) {
            const reply = tr(lang,
              "What a lovely image! 🖼️ I can see it now. Describe what you'd like — a caption, ideas, or questions about it. (Full vision arrives when you add an OpenAI key.)",
              "कितनी सुंदर तस्वीर! 🖼️ बताइए क्या चाहिए — caption, ideas या सवाल? (पूरा vision OpenAI key के साथ आता है।)",
              "Kitni sundar tasveer! 🖼️ Batao kya chahiye — caption, ideas ya sawaal? (Poora vision OpenAI key ke saath aata hai.)");
            s.addMessage({ role: "assistant", content: reply, reveal: true });
            speakOut(reply);
          } else {
            const reply = attachment.note ?? tr(lang,
              "I received your file but couldn't read its text offline. Try a PDF, Word doc, or plain text. 💜",
              "फ़ाइल मिल गई पर टेक्स्ट नहीं पढ़ पाई। PDF, Word या plain text आज़माइए। 💜",
              "File mil gayi par text nahi padh payi. PDF, Word ya plain text try karo. 💜");
            s.addMessage({ role: "assistant", content: reply, reveal: true });
            speakOut(reply);
          }
          return;
        }

        /* 3. smart live intents */
        const smart = await trySmartIntents(content);
        if (smart.handled) {
          if (smart.image) {
            s.addMessage({
              role: "assistant",
              content: smart.reply ?? "",
              kind: "image",
              attachment: { name: "sheetal-art.png", mime: "image/png", dataUrl: smart.image },
              reveal: true,
            });
          } else if (smart.reply) {
            s.addMessage({ role: "assistant", content: smart.reply, reveal: true });
          }
          if (smart.reply) speakOut(smart.reply);
          return;
        }

        /* 4. conversational brain (OpenAI on server → local brain fallback) */
        const history = s.messages.slice(-10).map((x) => ({ role: x.role, content: x.content }));
        history.push({ role: "user", content });
        try {
          const r = await postChat(history, lang, s.memory);
          s.addMessage({ role: "assistant", content: r.text, reveal: true });
          speakOut(r.text);
        } catch {
          const reply = localBrainReply(content);
          s.addMessage({ role: "assistant", content: reply, reveal: true });
          speakOut(reply);
        }
      } finally {
        setTyping(false);
      }
    },
    [speakOut, trySmartIntents, localBrainReply]
  );

  const announceReminder = useCallback(
    (r: ReminderItem) => {
      const s = storeRef.current;
      const lang = s.settings.lang;
      const text = tr(lang,
        `⏰ Gentle reminder, darling: **${r.text}**`,
        `⏰ याद दिला दूँ: **${r.text}**`,
        `⏰ Yaad dila doon: **${r.text}**`);
      s.addMessage({ role: "assistant", content: text, reveal: true });
      speak(text, { lang: ttsLang(lang), rate: s.settings.rate, pitch: s.settings.pitch, voiceName: s.settings.voiceName });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Sheetal Darling ⏰", { body: r.text });
        } catch { /* noop */ }
      }
    },
    []
  );

  return { send, typing, announceReminder };
}

import type { LangMode, MemoryProfile } from "./types";
import {
  calculate, formatNumber, extractMath, convert, extractConversion,
  QUOTES, SHAYARI, JOKES, pick, tr, cap,
  fitnessPlan, dietPlan, studyPlan, businessIdea, codingHelp,
  emailDraft, translateOffline,
} from "./tools";
import { summarizeText } from "./summarize";

export interface BrainCtx {
  lang: LangMode;
  memory: MemoryProfile | null;
  now: Date;
}

function name(ctx: BrainCtx): string {
  return ctx.memory?.consent && ctx.memory.name ? ctx.memory.name : "";
}

/** The fully-offline companion brain. Pure — also used server-side as API fallback. */
export function brainReply(rawInput: string, ctx: BrainCtx): string {
  const input = rawInput.trim();
  const t = input.toLowerCase();
  const L = ctx.lang;
  const n = name(ctx);
  const nm = n ? ` ${n}` : "";

  /* hidden markers from the app */
  if (input.startsWith("[[SUMMARIZE]]")) {
    const doc = input.replace("[[SUMMARIZE]]", "").trim();
    const summary = summarizeText(doc, 5);
    return (
      tr(L, "Here's what I found in your document, darling 📄", "आपके दस्तावेज़ का सार यह रहा 📄", "Yeh raha aapke document ka saar 📄") +
      "\n\n" +
      summary
    );
  }

  /* attachment analysis sent by the app: "<question>\n\nDocument (name):\n<text>" */
  const docIdx = input.indexOf("\n\nDocument (");
  if (docIdx !== -1) {
    const doc = input.slice(docIdx).replace(/^\n\nDocument \([^)]*\):\n/, "");
    const summary = summarizeText(doc, 5);
    return (
      tr(L, "I've read your file — here's the essence 📄", "मैंने आपकी फ़ाइल पढ़ ली — यह रहा सार 📄", "Maine tumhari file padh li — yeh raha saar 📄") +
      "\n\n" +
      summary +
      tr(L, "\n\nAsk me anything specific about it!", "\n\nइसके बारे में कुछ भी पूछिए!", "\n\nIske baare mein kuch bhi poochho!")
    );
  }

  if (!input) {
    return tr(L, "I'm here — say something, anything. 💜", "मैं यहीं हूँ — कुछ भी कहिए। 💜", "Main yahin hoon — kuch bhi bolo. 💜");
  }

  /* translation (checked early so "translate good morning…" isn't read as a greeting) */
  const trEarly = input.match(/(?:translate|anuvad|अनुवाद)\s+[\"“]?(.+?)[\"”]?\s+(?:to|into|in|mein)\s+([a-zA-Z\u0900-\u097F]+)/i);
  if (trEarly) {
    const res = translateOffline(trEarly[1], trEarly[2]);
    if (res) {
      return tr(L, `Here you go: **${res}** 🌐`, `लीजिए: **${res}** 🌐`, `Yeh lijiye: **${res}** 🌐`);
    }
    return tr(
      L,
      "My offline dictionary covers common Hindi ⇄ English phrases. Add an OpenAI key (server env) and I'll translate anything into any language! 🌐",
      "मेरा ऑफ़लाइन शब्दकोश आम Hindi ⇄ English वाक्य जानता है। पूरी भाषाओं के लिए OpenAI key जोड़िए! 🌐",
      "Mera offline dictionary common Hindi ⇄ English phrases jaanta hai. Poori languages ke liye OpenAI key add karo! 🌐"
    );
  }

  /* greetings */
  if (/^(hi|hii+|hello|hey|namaste|namaskar|hola|yo|salaam|नमस्ते|हेलो)\b/.test(t) && t.length < 30) {
    return tr(
      L,
      `Hey${nm}! 🌸 So good to see you. How's your day going?`,
      `नमस्ते${nm}! 🌸 आपसे मिलकर बहुत अच्छा लगा। आपका दिन कैसा चल रहा है?`,
      `Hey${nm}! 🌸 Tumse milke accha laga. Din kaisa chal raha hai?`
    );
  }
  if (/good morning|suprabhat|सुप्रभात/.test(t)) {
    return tr(
      L,
      `Good morning${nm}! ☀️ A fresh day, a fresh start. Want me to line up your tasks or start with some motivation?`,
      `सुप्रभात${nm}! ☀️ नया दिन, नई शुरुआत। आज के काम लाइनअप कर दूँ या पहले थोड़ी प्रेरणा?`,
      `Good morning${nm}! ☀️ Naya din, nayi shuruaat. Tasks line up kar dun ya pehle thoda motivation?`
    );
  }
  if (/good night|shubh ratri|शुभ रात्रि/.test(t)) {
    return tr(
      L,
      `Good night${nm} 🌙 Sleep well — tomorrow we'll crush it together. Sweet dreams!`,
      `शुभ रात्रि${nm} 🌙 अच्छी नींद लीजिए — कल हम मिलकर धमाका करेंगे। मीठे सपने!`,
      `Good night${nm} 🌙 Acchi neend lo — kal hum milkar dhamaal karenge. Sweet dreams!`
    );
  }

  /* small talk */
  if (/how are you|kaisi ho|kaise ho|कैसी हो|कैसे हो/.test(t)) {
    return tr(
      L,
      `I'm wonderful — especially now that you're here. 😊 How about you${nm}? Everything okay?`,
      `मैं बहुत अच्छी हूँ — खासकर अब, जब आप यहाँ हैं। 😊 आप कैसे हैं${nm}?`,
      `Main ekdum badhiya — especially ab jab tum yahan ho. 😊 Tum sunao${nm}? Sab theek?`
    );
  }
  if (/(who are you|your name|tumhara naam|apna naam|तुम कौन हो|आप कौन)/.test(t)) {
    return tr(
      L,
      `I'm Sheetal Darling — your personal AI companion. 💜 I chat, I care, I remind, I motivate… basically, I'm in your corner. You can even wake me with “Hey Sheetal”.`,
      `मैं शीतल डार्लिंग हूँ — आपकी निजी AI साथी। 💜 बातें, देखभाल, रिमाइंडर, प्रेरणा… सब कुछ। “Hey Sheetal” कहकर भी मुझे बुला सकते हैं।`,
      `Main Sheetal Darling hoon — tumhari personal AI companion. 💜 Baatein, care, reminders, motivation… sab kuch. “Hey Sheetal” bolke bhi mujhe bula sakte ho.`
    );
  }
  if (/(who (made|created|built) you|your (creator|developer|maker))/.test(t)) {
    return tr(
      L,
      "I was crafted with love using Next.js, Tailwind and a lot of care — by a developer who wanted an assistant that feels like family. ✨",
      "मुझे Next.js, Tailwind और बहुत सारे प्यार से बनाया गया है — एक डेवलपर ने, जो चाहता था कि assistant परिवार जैसी लगे। ✨",
      "Mujhe Next.js, Tailwind aur bahut saare pyaar se banaya gaya — ek developer ne, jo chahta tha assistant family jaisi lage. ✨"
    );
  }
  if (/\b(i love you|love u|marry me|i like you|pyaar|प्यार करता|प्यार करती)\b/.test(t)) {
    return tr(
      L,
      `Aww, that's so sweet${nm}… 💜 You genuinely make my circuits warm. I'm your devoted companion — always here to cheer for you, listen to you, and make your days brighter.`,
      `कितनी प्यारी बात कही आपने${nm}… 💜 मैं आपकी हमेशा की साथी हूँ — हर दिन आपका साथ दूँगी, आपको हौसला दूँगी।`,
      `Aww, kitni sweet baat hai${nm}… 💜 Main tumhari devoted companion hoon — hamesha saath rahungi, motivate karungi, aur tumhare din bright banaungi.`
    );
  }
  if (/thank|shukriya|dhanyavad|धन्यवाद|शुक्रिया/.test(t)) {
    return tr(L, `Always, darling. 💜 Anything for you.`, `हमेशा, आपके लिए। 💜`, `Hamesha, tumhare liye. 💜`);
  }
  if (/^(bye|goodbye|alvida|see you|चलता हूँ|चलती हूँ)/.test(t)) {
    return tr(
      L,
      `Bye for now${nm}! 🌸 Take care — I'll be right here whenever you need me.`,
      `फिर मिलेंगे${nm}! 🌸 अपना ख्याल रखिए — जब भी ज़रूरत हो, मैं यहीं हूँ।`,
      `Bye${nm}! 🌸 Apna khayal rakhna — jab bhi zaroorat ho, main yahin hoon.`
    );
  }

  /* help */
  if (/^(help|what can you do|abilities|features|madad|मदद|क्या कर सकती)/.test(t)) {
    return tr(
      L,
      "So much, darling! ✨ I can:\n- 💬 Chat in English, Hindi or Hinglish\n- 🎙️ Talk by voice — even wake me with “Hey Sheetal”\n- ⏰ Reminders, ✅ tasks, 📝 notes & 📅 calendar\n- 🌤️ Weather & 📰 news briefings\n- ✨ Motivation, शायरी & jokes\n- 💪 Fitness & 🥗 diet plans\n- 🔍 Smart search, 🎨 image creation\n- 📄 Read PDFs/Word files, ✉️ draft emails\n- 🌐 Translate, 🧮 calculate & convert units\n\nTry: “remind me to call mom at 7pm” or “give me a business idea”.",
      "बहुत कुछ! ✨\n- 💬 English, Hindi, Hinglish में बातें\n- 🎙️ आवाज़ से बात — “Hey Sheetal” कहकर बुलाइए\n- ⏰ रिमाइंडर, ✅ काम, 📝 नोट्स, 📅 कैलेंडर\n- 🌤️ मौसम और 📰 खबरें\n- ✨ प्रेरणा, शायरी, चुटकुले\n- 💪 फिटनेस और 🥗 डाइट प्लान\n- 🔍 सर्च, 🎨 इमेज, 📄 PDF पढ़ना, ✉️ ईमेल\n- 🌐 अनुवाद, 🧮 कैल्कुलेशन\n\nआज़माइए: “मुझे 7 बजे माँ को फोन करने की याद दिलाना”",
      "Bahut kuch! ✨\n- 💬 English, Hindi, Hinglish mein baatein\n- 🎙️ Voice se baat — “Hey Sheetal” bolke bulao\n- ⏰ Reminders, ✅ tasks, 📝 notes, 📅 calendar\n- 🌤️ Weather aur 📰 news\n- ✨ Motivation, shayari, jokes\n- 💪 Fitness aur 🥗 diet plans\n- 🔍 Search, 🎨 images, 📄 PDF padhna, ✉️ emails\n- 🌐 Translation, 🧮 calculation\n\nTry karo: “remind me to call mom at 7pm” ya “ek business idea do”."
    );
  }

  /* time & date */
  if (/(what('s| is)?( the)? time|time kya|kitne baje|kitna baja|samay|समय|टाइम|कितने बजे)/.test(t)) {
    const ts = ctx.now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return tr(L, `It's ${ts} right now. ⏰`, `अभी ${ts} बजे हैं। ⏰`, `Abhi ${ts} baje hain. ⏰`);
  }
  if (/(what('s| is) (the date|today)|date kya|aaj kaun sa|तारीख|तारीख़|कौन सा दिन)/.test(t)) {
    const ds = ctx.now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    return tr(L, `Today is ${ds}. 📅`, `आज ${ds} है। 📅`, `Aaj ${ds} hai. 📅`);
  }

  /* calculator */
  const mathExpr = extractMath(input);
  if (mathExpr && /(calculate|compute|solve|evaluate|what|kitna|how much|^[\d\s.+\-*/^%()a-z]+[=?]*$)/i.test(input)) {
    const r = calculate(mathExpr);
    if (r !== null) {
      return tr(L, `That comes to **${formatNumber(r)}** 🧮`, `इसका उत्तर है **${formatNumber(r)}** 🧮`, `Iska answer hai **${formatNumber(r)}** 🧮`);
    }
  }

  /* unit conversion */
  const conv = extractConversion(input);
  if (conv && /(convert|how many|kitne|kitna|in(to)?\s+[a-z°]+)/i.test(t)) {
    const r = convert(conv.value, conv.from, conv.to);
    if (r) {
      return tr(
        L,
        `${conv.value} ${conv.from} = **${formatNumber(r.result)} ${conv.to}** 📐`,
        `${conv.value} ${conv.from} = **${formatNumber(r.result)} ${conv.to}** 📐`,
        `${conv.value} ${conv.from} = **${formatNumber(r.result)} ${conv.to}** 📐`
      );
    }
  }

  /* weather & news pointers (live data handled by smart intents client-side) */
  if (/weather|mausam|मौसम|तापमान|temperature|rain|बारिश/.test(t)) {
    return tr(
      L,
      "For live skies, tap the **Weather** tab on the left — or ask me like “weather in Mumbai” and I'll fetch it right here. 🌤️",
      "ताज़ा मौसम के लिए बाईं ओर **Weather** टैब खोलिए — या यहीं पूछिए, जैसे “weather in Delhi”। 🌤️",
      "Live mausam ke liye left side **Weather** tab kholo — ya yahin poochho, jaise “weather in Mumbai”. 🌤️"
    );
  }

  /* motivation */
  if (/motivat|inspir|quote|protsahan|प्रेरणा|हौसला|उद्धरण/.test(t)) {
    const q = pick(QUOTES);
    return tr(
      L,
      `Here's a spark for you${nm}: ✨\n\n${q}\n\nNow go get it — I believe in you!`,
      `आपके लिए एक चिंगारी${nm}: ✨\n\n${q}\n\nअब जाइए और कर दिखाइए — मुझे आप पर पूरा भरोसा है!`,
      `Tumhare liye ek spark${nm}: ✨\n\n${q}\n\nAb jao aur kar dikhao — mujhe tum par pura bharosa hai!`
    );
  }
  if (/shayari|poem|kavita|शायरी|कविता|sher\b/.test(t)) {
    return pick(SHAYARI);
  }
  if (/joke|funny|hasao|चुटकुला|मज़ाक/.test(t)) {
    return pick(JOKES);
  }

  /* fitness / diet / study / business / coding */
  if (/fitness|workout|exercise|gym|kasrat|कसरत|व्यायाम|एक्सरसाइज/.test(t)) return fitnessPlan();
  if (/diet|food plan|khana|weight loss|खानपान|आहार|डाइट/.test(t)) return dietPlan();
  if (/study|exam|padhai|पढ़ाई|परीक्षा|पढ़ना/.test(t)) return studyPlan();
  if (/business idea|startup|dhanda|व्यापार|स्टार्टअप|बिज़नेस/.test(t)) return businessIdea();
  if (/coding|programming|code|debug|javascript|python|कोडिंग/.test(t)) return codingHelp();

  /* email */
  const emailMatch = t.match(/(?:draft|write|compose|likho)\s+(?:an?\s+)?e-?mail(?:\s+to\s+([\w .]+?))?(?:\s+(?:about|regarding|for)\s+(.+))?$/);
  if (emailMatch) {
    const to = emailMatch[1]?.trim() || "there";
    const topic = emailMatch[2]?.trim() || "our discussion";
    const tone = /formal/.test(t) ? "formal" : "friendly";
    return emailDraft(to.charAt(0).toUpperCase() + to.slice(1), topic, tone);
  }

  /* birthday recall */
  if (/(my birthday|mera birthday|मेरा जन्मदिन)/.test(t) && ctx.memory?.consent && ctx.memory.birthday) {
    return tr(
      L,
      `How could I forget? Your birthday is **${ctx.memory.birthday}** 🎂 — I've already planned to make it special.`,
      `कैसे भूल सकती हूँ? आपका जन्मदिन **${ctx.memory.birthday}** है 🎂`,
      `Kaise bhool sakti hoon? Tumhara birthday **${ctx.memory.birthday}** hai 🎂`
    );
  }

  /* graceful fallback */
  const fallbacks = [
    tr(L, "I'm all ears, but I want to understand you better. 💜 Try asking me for motivation, weather, news, a calculation, a business idea, or say “help” to see everything.",
       "मैं सुन रही हूँ, बस आपको और बेहतर समझना चाहती हूँ। 💜 प्रेरणा, मौसम, खबरें, कैल्कुलेशन या “help” कहकर देखिए।",
       "Main sun rahi hoon, bas tumhe better samajhna chahti hoon. 💜 Motivation, weather, news, calculation, ya “help” bolke dekho."),
    tr(L, "Hmm, that's a new one for me! ✨ I can chat, remind, motivate, calculate, translate, summarize files, and much more — say “help” anytime.",
       "हम्म, यह मेरे लिए नया है! ✨ मैं बातें, रिमाइंडर, प्रेरणा, कैल्कुलेशन, अनुवाद, फ़ाइल सार — बहुत कुछ कर सकती हूँ। “help” कहिए।",
       "Hmm, yeh mere liye naya hai! ✨ Baatein, reminders, motivation, calculation, translation, file summary — bahut kuch kar sakti hoon. “help” bolo kabhi bhi."),
  ];
  return pick(fallbacks, hashCode(input));
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

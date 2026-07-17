# 💜 Sheetal Darling — AI Personal Assistant

A premium, human-feeling AI companion. Friendly, caring, intelligent, gently romantic and always respectful — Sheetal chats in **English, Hindi and Hinglish**, speaks with a warm voice, remembers what matters (with your consent), and runs your day with you.

![stack](https://img.shields.io/badge/Next.js-14-black) ![style](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![privacy](https://img.shields.io/badge/privacy-local--first%20AES--256-a855f7)

## ✨ Features

| Area | What Sheetal does |
| --- | --- |
| 💬 Chat | Typewriter animation, rich text, suggestion chips, trilingual (EN / हिंदी / Hinglish) |
| 🎙️ Voice | Speech-to-text input + warm text-to-speech replies (Web Speech API) |
| 🗣️ Wake word | Say **“Hey Sheetal”** — hands-free conversation while the tab is open |
| 🧠 Memory | Name, favourites, birthdays, routines — consent-gated, AES-256 encrypted on-device |
| ⏰ Productivity | Reminders (with notifications + spoken alerts), tasks, notes, calendar with `.ics` export |
| 🌤️ Info | Weather (live with OpenWeather key, demo otherwise) + news briefings (live Hacker News) |
| ✨ Companion | Motivational quotes, shayari, jokes, romantic-but-respectful persona |
| 💪 Wellness | Fitness routines & Indian diet plans |
| 🔍 Smart search | DuckDuckGo instant answers + curated links, right in chat |
| 🎨 Images | DALL·E when an OpenAI key is set; procedural “dream-art” offline |
| 📄 Files | PDF / Word / text / image analysis — dependency-free, on-device extraction + summary |
| ✉️ Writing | Email drafting (formal/friendly), Hindi ⇄ English translation |
| 🧮 Utilities | Safe calculator (no `eval`) & unit conversion |
| 💡 Growth | Business ideas, study plans, coding help |

## 🏗️ Tech

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS — dark glassmorphism, purple/pink/blue gradients, buttery animations, fully responsive
- **Backend:** Next.js API routes (`/api/chat`, `/api/weather`, `/api/news`, `/api/search`, `/api/image`)
- **AI:** OpenAI GPT (when `OPENAI_API_KEY` is set) → automatic fallback to a built-in **offline companion brain** (`lib/localBrain.ts`) — the app is 100% usable with zero keys
- **Voice:** Web Speech API (Whisper-class STT in Chrome/Edge, natural TTS voices)
- **Storage:** localStorage, AES-256-GCM encrypted with a per-device key (WebCrypto)

## 🚀 Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

Optional superpowers — copy `.env.example` → `.env.local` and fill in:

```bash
OPENAI_API_KEY=sk-...          # GPT brain + DALL·E images
OPENAI_MODEL=gpt-4o-mini
OPENWEATHER_API_KEY=...        # live weather
```

Everything works without keys: local brain, demo weather, live HN news, DDG search, dream-art.

## 💜 Try saying

- `Hey Sheetal` … “what's the weather in Pune?”
- `my name is Aarav` → `my favourite song is Tum Hi Ho` → `what do you remember?`
- `remind me to call mom tomorrow at 7pm`
- `add task submit the report` → `complete task report`
- `generate an image of a sunset over mountains`
- `note that the wifi password is purple-tiger-42`
- `what is 18% of 4500` · `convert 5 miles to km`
- `draft an email to my manager about sick leave`
- `मुझे एक शायरी सुनाओ` · `motivate me` · `give me a business idea`

## 🔒 Privacy

- Memory is **off by default** — enable it in Settings → Memory & Privacy
- All state is encrypted (AES-256-GCM) with a key generated on, and never leaving, your device
- No account, no tracking, no analytics
- Chat text goes to OpenAI **only** if you configure a key on your own server
- One-click **export** (JSON) and **delete everything**

## 🗺️ Roadmap hooks

The codebase is structured so these drop in cleanly:

- **Supabase/Firebase auth** (Google / Apple / Email) — add a provider in `app/layout.tsx` and swap `lib/store` persistence for cloud sync
- **Whisper API STT** — replace `lib/speech.ts → startRecognition`
- **Open-source LLM** (Ollama/LM Studio) — point `/api/chat` at your local endpoint
- **Real calendar sync** — extend `components/panels.tsx → exportICS` with Google Calendar API

## 📁 Structure

```
app/
  page.tsx              landing page
  assistant/page.tsx    main app shell (wake word, reminders, routing)
  api/                  chat · weather · news · search · image
components/
  Chat.tsx              messages, typewriter, mic, attachments
  Sidebar.tsx           navigation (desktop rail + mobile bar)
  panels.tsx            notes · tasks · reminders · calendar · weather · news · files · create · settings
  Background.tsx        animated gradient universe
lib/
  localBrain.ts         offline companion brain (pure, also used server-side)
  tools.ts              calculator, converters, quotes, planners, parsers
  actions.ts            chat commands → tasks/reminders/memory
  store.tsx             encrypted persisted state + reminder engine
  speech.ts             STT · TTS · wake word
  fileparse.ts          PDF/DOCX/text/image extraction (no deps)
  artgen.ts             procedural dream-art fallback
  crypto.ts             AES-256-GCM device encryption
```

Made with 💜 — *friendly, caring, yours.*

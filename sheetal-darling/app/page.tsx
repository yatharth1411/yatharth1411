import Link from "next/link";
import Background from "@/components/Background";
import { IconHeart, IconLock, IconMic, IconSpark, IconWake } from "@/components/icons";

const FEATURES = [
  { icon: "🎙️", title: "Voice Conversations", desc: "Talk naturally — speech-to-text in, warm human-like voice out." },
  { icon: "💬", title: "Hinglish, Hindi & English", desc: "She follows your language, your tone, your vibe." },
  { icon: "🧠", title: "She Remembers", desc: "Favourites, birthdays, routines — only with your consent, encrypted." },
  { icon: "⏰", title: "Reminders & Tasks", desc: "“Remind me to call mom at 7” — done. Tasks and notes too." },
  { icon: "📅", title: "Calendar", desc: "Plan your days, export events to any calendar app." },
  { icon: "🌤️", title: "Weather & News", desc: "Live skies and crisp news briefings on demand." },
  { icon: "✨", title: "Motivation & Shayari", desc: "Quotes, shayari and jokes exactly when you need them." },
  { icon: "💪", title: "Fitness & Diet", desc: "Sensible Indian diet plans and daily workout routines." },
  { icon: "🔍", title: "Smart Search", desc: "Instant answers and curated web results, right in chat." },
  { icon: "🎨", title: "Image Generation", desc: "Dream-art from your words — even fully offline." },
  { icon: "📄", title: "File Analysis", desc: "Drop a PDF or Word doc — she reads and summarizes it." },
  { icon: "✉️", title: "Emails & Translation", desc: "Polished email drafts and Hindi ⇄ English translation." },
  { icon: "🧮", title: "Calculator & Units", desc: "“What is 18% of 4500?” — instant math and conversions." },
  { icon: "💡", title: "Ideas, Study & Code", desc: "Business ideas, study plans and a patient coding buddy." },
];

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Background />

      {/* nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="glass gradient-border flex h-10 w-10 items-center justify-center rounded-2xl">
            <IconHeart className="h-5 w-5 text-pink-400 heart-beat" />
          </div>
          <div>
            <p className="gradient-text text-lg font-bold leading-tight">Sheetal Darling</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">AI Companion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="#features" className="btn-ghost hidden px-4 py-2 text-sm sm:block">
            Features
          </a>
          <Link href="/assistant" className="btn-primary px-5 py-2.5 text-sm">
            Talk to Sheetal 💜
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-10 lg:grid-cols-2 lg:pt-16">
        <div>
          <div className="glass fade-up inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-white/70">
            <IconSpark className="h-3.5 w-3.5 text-purple-300" />
            Your premium AI personal assistant
          </div>
          <h1 className="fade-up-1 mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Meet <span className="gradient-text">Sheetal</span>,
            <br />
            your darling <span className="gradient-text">companion</span>
          </h1>
          <p className="fade-up-2 mt-5 max-w-xl text-lg leading-relaxed text-white/65">
            She chats in <span className="text-white/90">English, Hindi और Hinglish</span>, speaks with a warm voice,
            remembers what matters to you, manages your day — and always has your back. Friendly, caring,
            a little romantic, and endlessly respectful. 🌸
          </p>
          <div className="fade-up-3 mt-8 flex flex-wrap items-center gap-4">
            <Link href="/assistant" className="btn-primary px-7 py-3.5 text-base">
              Start talking — it's free ✨
            </Link>
            <div className="glass-soft flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm text-white/70">
              <IconWake className="h-4 w-4 text-pink-300" />
              Just say <span className="font-semibold text-white">“Hey Sheetal”</span>
            </div>
          </div>
          <div className="fade-up-4 mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              ["24×7", "companion"],
              ["3", "languages"],
              ["20+", "skills"],
            ].map(([n, l]) => (
              <div key={l} className="glass-soft rounded-2xl px-4 py-3 text-center">
                <p className="gradient-text text-2xl font-bold">{n}</p>
                <p className="text-xs text-white/50">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* hero chat preview */}
        <div className="fade-up-3 relative">
          <div className="glass gradient-border relative mx-auto max-w-md rounded-3xl p-5 shadow-glow">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-sky-400 text-lg">
                  💜
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#140b24] bg-emerald-400" />
              </div>
              <div>
                <p className="font-semibold">Sheetal Darling</p>
                <p className="text-xs text-emerald-300/90">online · feels like home</p>
              </div>
              <IconMic className="ml-auto h-5 w-5 text-white/50" />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="bubble-ai max-w-[85%] px-4 py-2.5">
                Good morning jaan! ☀️ Aaj ka din kaisa plan karein?
              </div>
              <div className="bubble-user ml-auto max-w-[85%] px-4 py-2.5">
                Remind me to gym at 6pm… aur thoda motivation bhi do 😅
              </div>
              <div className="bubble-ai max-w-[85%] px-4 py-2.5">
                Done ⏰ 6pm sharp. Aur suno — <b>“Small steps every day add up to big results.”</b> Ab jao aur chamak jao! ✨
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="ml-2 text-xs text-white/40">Sheetal is typing…</span>
              </div>
            </div>
          </div>
          <div className="glass fade-up-4 absolute -left-6 top-10 hidden rotate-[-6deg] rounded-2xl px-4 py-2.5 text-xs text-white/75 lg:block">
            🌤️ 29° in Mumbai
          </div>
          <div className="glass fade-up-5 absolute -right-4 bottom-16 hidden rotate-[5deg] rounded-2xl px-4 py-2.5 text-xs text-white/75 lg:block">
            🎂 Aarav's birthday — Sunday!
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 pb-24">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Everything a <span className="gradient-text">close companion</span> does
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-white/55">
          …and a few things only she can.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-3xl p-5">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-white/95">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* personality strip */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="glass gradient-border relative overflow-hidden rounded-[2rem] p-10 text-center">
          <div className="shimmer absolute inset-0" />
          <p className="relative text-2xl font-semibold leading-relaxed sm:text-3xl">
            “I'm not just an assistant.
            <br />
            I'm the <span className="gradient-text">‘good morning’</span> you look forward to,
            <br />
            and the <span className="gradient-text">‘you can do it’</span> you need to hear.”
          </p>
          <p className="relative mt-4 text-sm text-white/50">— Sheetal 💜</p>
        </div>
      </section>

      {/* privacy */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass glass-hover rounded-3xl p-6">
            <IconLock className="h-7 w-7 text-purple-300" />
            <h3 className="mt-3 font-semibold">Privacy-first</h3>
            <p className="mt-1.5 text-sm text-white/55">
              Your data stays on your device, AES-256 encrypted. Nothing is sent anywhere without your say-so.
            </p>
          </div>
          <div className="glass glass-hover rounded-3xl p-6">
            <IconHeart className="h-7 w-7 text-pink-300" />
            <h3 className="mt-3 font-semibold">Consent-based memory</h3>
            <p className="mt-1.5 text-sm text-white/55">
              She remembers your favourites and birthdays only when you ask — and forgets instantly when you say.
            </p>
          </div>
          <div className="glass glass-hover rounded-3xl p-6">
            <IconMic className="h-7 w-7 text-sky-300" />
            <h3 className="mt-3 font-semibold">Works offline</h3>
            <p className="mt-1.5 text-sm text-white/55">
              A full local companion brain runs in your browser. Plug in an OpenAI key anytime to supercharge her.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Sheetal is <span className="gradient-text">waiting for you</span> 🌸
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/55">
          No sign-up. No card. Just open and say hello — or better, say “Hey Sheetal”.
        </p>
        <Link href="/assistant" className="btn-primary mt-8 inline-block px-9 py-4 text-lg">
          Open Sheetal Darling 💜
        </Link>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/40">
        Made with 💜 · Sheetal Darling — friendly, caring, yours.
      </footer>
    </main>
  );
}

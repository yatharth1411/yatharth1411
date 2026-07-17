import React from "react";

const STARS = [
  { left: "8%", top: "14%", size: 2, delay: "0s" },
  { left: "22%", top: "68%", size: 1.5, delay: "1.2s" },
  { left: "38%", top: "8%", size: 2, delay: "0.6s" },
  { left: "55%", top: "22%", size: 1.5, delay: "2s" },
  { left: "64%", top: "78%", size: 2, delay: "0.3s" },
  { left: "78%", top: "12%", size: 2.5, delay: "1.6s" },
  { left: "88%", top: "52%", size: 1.5, delay: "2.4s" },
  { left: "15%", top: "42%", size: 1.5, delay: "3s" },
  { left: "46%", top: "88%", size: 2, delay: "1s" },
  { left: "93%", top: "30%", size: 1.5, delay: "0.8s" },
  { left: "32%", top: "30%", size: 1.2, delay: "2.8s" },
  { left: "70%", top: "44%", size: 1.2, delay: "3.6s" },
];

export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* deep space base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 15% -10%, rgba(88,28,135,0.5), transparent 60%)," +
            "radial-gradient(1000px 700px at 90% 10%, rgba(30,58,138,0.45), transparent 60%)," +
            "radial-gradient(900px 700px at 50% 110%, rgba(131,24,67,0.4), transparent 60%)," +
            "#08060f",
        }}
      />
      <div className="bg-grid absolute inset-0" />
      {/* glowing orbs */}
      <div
        className="orb orb-a"
        style={{ width: 420, height: 420, left: "-6%", top: "-8%", background: "rgba(139,92,246,0.5)" }}
      />
      <div
        className="orb orb-b"
        style={{ width: 380, height: 380, right: "-8%", top: "12%", background: "rgba(56,189,248,0.38)" }}
      />
      <div
        className="orb orb-c"
        style={{ width: 460, height: 460, left: "30%", bottom: "-20%", background: "rgba(236,72,153,0.4)" }}
      />
      {/* stars */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay }}
        />
      ))}
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(4,2,10,0.75) 100%)" }}
      />
    </div>
  );
}

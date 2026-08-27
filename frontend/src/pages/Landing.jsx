import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Zap, QrCode, Receipt, Type as TypeIcon, ImageIcon, Link2 as LinkIcon, Eye } from "lucide-react";
import Hero3D from "@/components/Hero3D";
import Header from "@/components/Header";
import CheckerWorkspace from "@/components/CheckerWorkspace";
import MagneticButton from "@/components/MagneticButton";
import PeelSticker from "@/components/PeelSticker";
import PopHeading from "@/components/PopHeading";

/* Little tagline chip — used like "00_3", "NY", "TL" markers on the reference */
function Chip({ children, className = "" }) {
  return (
    <span className={`font-mono text-[10px] tracking-[0.24em] uppercase px-2 py-1 border rounded-full ${className}`}>
      {children}
    </span>
  );
}

/* Rotating star/plus decoration mark */
function SpinMark({ size = 46, color = "#C1443B", className = "" }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      animate={{ rotate: 360 }}
      transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      aria-hidden
    >
      <path
        d="M50 0 L58 42 L100 50 L58 58 L50 100 L42 58 L0 50 L42 42 Z"
        fill={color}
      />
    </motion.svg>
  );
}

/* Horizontal marching word row (variable speed / direction) */
function MarchRow({ words, dir = "left", speed = 26, className = "", color, bg }) {
  const row = [...words, ...words, ...words];
  const from = dir === "left" ? [0, "-33.333%"] : ["-33.333%", 0];
  return (
    <div className={`overflow-hidden py-3 ${className}`} style={{ background: bg, color }}>
      <motion.div
        className="flex whitespace-nowrap font-poster text-4xl md:text-6xl gap-10 items-center"
        animate={{ x: from }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-10">
            <span>{w}</span>
            <span aria-hidden className="inline-block">
              <SpinMark size={22} color={color === "#EEF1F6" ? "#FFD84D" : "#1B2340"} />
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* Vertical stacked-word tower — one huge word per line, editorial gallery vibe */
function WordTower({ items }) {
  return (
    <div className="flex flex-col items-start gap-1 md:gap-2">
      {items.map((row, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4 md:gap-6"
        >
          <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/60">{String(i + 1).padStart(2, "0")}</Chip>
          <span className={`font-poster text-6xl md:text-8xl lg:text-9xl leading-[0.9] tracking-tighter ${row.accent ? "text-[#FFD84D]" : "text-[#EEF1F6]"}`}>
            {row.word}
          </span>
          {row.icon}
        </motion.div>
      ))}
    </div>
  );
}

/* Horizontal poster reel — scrolls left as you scroll the page */
function PosterReel() {
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0.15, 0.55], ["0%", "-42%"]);
  const posters = [
    { tag: "TEXT · REAL", color: "#2F8F6F", value: "99%", label: "Human-written" },
    { tag: "IMAGE · AI", color: "#C1443B", value: "94%", label: "AI-generated" },
    { tag: "URL · REAL", color: "#7DE0B8", value: "97%", label: "Authentic" },
    { tag: "QR · SAFE", color: "#FFD84D", value: "SAFE", label: "HTTPS · Known domain" },
    { tag: "IMAGE · REAL", color: "#EEF1F6", value: "88%", label: "Photograph" },
    { tag: "PAY · CAUTION", color: "#FF7A6A", value: "72%", label: "Possible edits" },
    { tag: "TEXT · AI", color: "#1B2340", value: "91%", label: "Model output" },
    { tag: "URL · CAUTION", color: "#E5A24A", value: "63%", label: "Uses shortener" },
  ];
  return (
    <div className="relative overflow-hidden">
      <motion.div className="flex gap-6 pl-6 pr-6" style={{ x }}>
        {posters.map((p, i) => (
          <div
            key={i}
            className="shrink-0 w-[280px] md:w-[340px] h-[380px] md:h-[440px] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden"
            style={{ background: p.color, color: p.color === "#EEF1F6" || p.color === "#FFD84D" || p.color === "#7DE0B8" ? "#1B2340" : "#EEF1F6" }}
          >
            <div className="flex items-start justify-between">
              <Chip className="border-current/30">{p.tag}</Chip>
              <SpinMark size={24} color="currentColor" />
            </div>
            <div>
              <div className="font-poster text-6xl md:text-7xl leading-none tracking-tighter">{p.value}</div>
              <div className="mt-3 text-sm opacity-80">{p.label}</div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
              <span>TL / {String(i + 1).padStart(3, "0")}</span>
              <span>·</span>
              <span>TRUELENSE / 2026</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* Draggable corner sticker with a tip label */
function CornerSticker() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ delay: 1.6, type: "spring", stiffness: 260 }}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2"
      data-noburst
    >
      <div className="peel yellow" style={{ transform: "rotate(-4deg)" }}>
        <div className="font-mono text-[10px] tracking-[0.24em] uppercase opacity-70">Tip</div>
        <div className="font-poster text-lg leading-none mt-1">DRAG THE STICKERS →</div>
      </div>
      <button onClick={() => setDismissed(true)} className="text-[10px] font-mono text-[#1B2340]/50 hover:text-[#1B2340]" data-noburst>dismiss ×</button>
    </motion.div>
  );
}

export default function Landing() {
  const scrollToApp = () => document.getElementById("app-section")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[#EEF1F6] text-[#1B2340] overflow-x-hidden">
      <Header dark />

      {/* HERO — restored 3D navy scene */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        <Hero3D />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 grid md:grid-cols-12 gap-10 w-full">
          <div className="md:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="flex items-center gap-3 mb-6"
            >
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">TL — Est. 2026</Chip>
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">Public Beta</Chip>
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">v1.0</Chip>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1 }}
              className="font-poster text-[#EEF1F6] text-5xl md:text-7xl lg:text-8xl leading-[0.92] tracking-tighter"
              data-testid="hero-headline"
            >
              NOT EVERYTHING<br />
              YOU SEE<br />
              <span className="text-[#2F8F6F]">IS REAL.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="text-[#EEF1F6]/85 text-lg md:text-xl mt-8 max-w-2xl leading-relaxed"
            >
              Paste, drop, verify. TrueLense scans text, images, articles, QR codes and payment screenshots for AI fingerprints — right in your browser. No app, any device.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <MagneticButton>
                <button onClick={scrollToApp} className="btn-pill bg-[#EEF1F6] text-[#1B2340] hover:bg-white text-base" data-testid="try-it-free-btn">
                  Try it free <ArrowRight size={16} className="inline ml-1" />
                </button>
              </MagneticButton>
              <MagneticButton>
                <Link to="/pricing" className="btn-pill bg-white/10 text-[#EEF1F6] hover:bg-white/20 text-base" data-testid="hero-pricing-btn">
                  See pricing
                </Link>
              </MagneticButton>
            </motion.div>
          </div>

          <div className="md:col-span-4 relative min-h-[420px] hidden md:block">
            <div className="absolute top-6 right-2"><PeelSticker color="yellow" rotate={-8} size="md">SCAN NOW</PeelSticker></div>
            <div className="absolute top-32 left-2"><PeelSticker color="mint" rotate={6} size="md">REAL ✓</PeelSticker></div>
            <div className="absolute top-56 right-6"><PeelSticker color="coral" rotate={-4} size="md">AI-GEN?</PeelSticker></div>
            <div className="absolute top-80 left-6"><PeelSticker color="paper" rotate={4} size="sm">DRAG ME</PeelSticker></div>
          </div>
        </div>

        {/* Bottom marching row inside hero */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <MarchRow
            words={["TRUELENSE", "· AI OR REAL? ·", "TEXT", "IMAGE", "URL", "QR", "PAYMENT", "·"]}
            color="#EEF1F6"
            bg="rgba(15,20,40,0.55)"
            speed={30}
          />
        </div>
      </section>

      {/* WORD TOWER section — big vertical editorial */}
      <section className="relative bg-[#1B2340] text-[#EEF1F6] py-24 md:py-32 overflow-hidden">
        <div className="absolute -right-24 top-16 opacity-20">
          <SpinMark size={280} color="#FFD84D" />
        </div>
        <div className="absolute -left-16 bottom-16 opacity-15">
          <SpinMark size={220} color="#C1443B" />
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-10 relative">
          <div className="md:col-span-4">
            <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/60">00_1 — What we do</Chip>
            <p className="mt-6 text-[#EEF1F6]/70 leading-relaxed max-w-sm">
              Five scanners. One clean verdict per check. Confidence in a number, reasons in plain English. That's it — that's the product.
            </p>
            <div className="mt-8 flex gap-2 flex-wrap">
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">WINSTON</Chip>
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">SIGHTENGINE</Chip>
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/80">TRAFILATURA</Chip>
            </div>
          </div>
          <div className="md:col-span-8">
            <WordTower
              items={[
                { word: "TEXT", accent: false },
                { word: "IMAGE", accent: true },
                { word: "URL", accent: false },
                { word: "QR-CODE", accent: false },
                { word: "PAYMENT", accent: true },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Poster reel */}
      <section className="relative bg-[#EEF1F6] py-20 md:py-24 halftone">
        <div className="max-w-7xl mx-auto px-6 mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <Chip className="border-[#1B2340]/30 text-[#1B2340]/70">00_2 — Recent verdicts</Chip>
            <PopHeading text="GALLERY" className="text-5xl md:text-7xl mt-3" />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <SpinMark size={30} color="#C1443B" />
            <span className="font-mono text-xs tracking-[0.24em] opacity-70">SCROLL TO PLAY →</span>
          </div>
        </div>
        <PosterReel />
      </section>

      {/* Yellow marching strip */}
      <MarchRow
        words={["VERIFY TEXT", "SPOT AI IMAGES", "SCAN URLS", "QR SAFETY", "PAYMENT SS", "IN YOUR BROWSER"]}
        color="#1B2340"
        bg="#FFD84D"
        speed={28}
      />

      {/* App tool section */}
      <section id="app-section" className="relative py-20 md:py-28 bg-[#EEF1F6] paper-tex">
        <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <Chip className="border-[#1B2340]/30 text-[#1B2340]/70">00_3 — The tool</Chip>
            <h2 className="font-poster text-5xl md:text-7xl mt-3 tracking-tighter leading-[0.9]">VERIFY.<br />RIGHT NOW.</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            <PeelSticker color="mint" rotate={-4} size="sm" draggable={false}>GREEN = REAL</PeelSticker>
            <PeelSticker color="red" rotate={3} size="sm" draggable={false}>RED = FLAGGED</PeelSticker>
          </div>
        </div>
        <CheckerWorkspace />
      </section>

      {/* Coral marching strip */}
      <MarchRow
        words={["TRUELENSE", "NOT REAL?", "PROVE IT.", "TRUELENSE", "SCAN IT.", "SHIP IT."]}
        color="#EEF1F6"
        bg="#C1443B"
        speed={26}
      />

      {/* Bento why-us */}
      <section className="relative bg-[#1B2340] text-[#EEF1F6] py-20 md:py-28 halftone-light overflow-hidden">
        <div className="absolute top-10 right-10 opacity-30 hidden md:block">
          <SpinMark size={100} color="#FFD84D" />
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14 flex items-end justify-between flex-wrap gap-6">
            <div>
              <Chip className="border-[#EEF1F6]/30 text-[#EEF1F6]/60">00_4 — Why us</Chip>
              <h2 className="font-poster text-5xl md:text-7xl mt-3 tracking-tighter">WHY US?</h2>
            </div>
            <PeelSticker color="yellow" rotate={-6} size="md" draggable={false}>NO INSTALL</PeelSticker>
          </div>
          <div className="grid md:grid-cols-6 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-4 rounded-3xl bg-[#FFD84D] text-[#1B2340] p-8 md:p-12 relative">
              <div className="tape" style={{ top: -10, left: 40, rotate: "-4deg" }} />
              <ShieldCheck size={28} className="mb-4" />
              <div className="font-poster text-3xl md:text-5xl leading-none">REAL DETECTION ENGINES</div>
              <p className="mt-4 max-w-md text-lg opacity-80">Winston AI checks text and article URLs. Sightengine checks images and payment screenshots. Not vibes — actual APIs, in real time.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-2 rounded-3xl bg-[#FF7A6A] text-[#1B2340] p-8 relative">
              <div className="tape" style={{ top: -10, right: 20, rotate: "6deg", background: "rgba(125,224,184,0.75)" }} />
              <Zap size={28} className="mb-4" />
              <div className="font-poster text-3xl leading-none">FAST · LIGHT</div>
              <p className="mt-3 opacity-85">Phones, iPads, laptops, classroom smart boards.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-3 rounded-3xl bg-[#7DE0B8] text-[#1B2340] p-8 relative">
              <div className="font-poster text-2xl md:text-3xl leading-none">CLEAR VERDICTS</div>
              <p className="mt-3">Green = real. Red = flagged. Every check ships a confidence score you can screenshot.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-3 rounded-3xl bg-[#EEF1F6] text-[#1B2340] p-8 relative">
              <div className="font-poster text-2xl md:text-3xl leading-none">STAY PRIVATE</div>
              <p className="mt-3">We only send what you scan. Anonymous 5-scan free tier. Sign up when you like it.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA finale */}
      <section className="relative py-24 bg-[#EEF1F6] paper-tex text-center overflow-hidden">
        <div className="absolute -top-12 left-8 opacity-30">
          <SpinMark size={180} color="#7DE0B8" />
        </div>
        <div className="absolute -bottom-10 right-10 opacity-30">
          <SpinMark size={140} color="#FF7A6A" />
        </div>
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="absolute -top-4 left-[18%] -rotate-6 hidden md:block">
            <PeelSticker color="coral" size="md" draggable={false}>FREE FOREVER PLAN</PeelSticker>
          </div>
          <div className="absolute -top-2 right-[18%] rotate-6 hidden md:block">
            <PeelSticker color="mint" size="md" draggable={false}>NO CARD NEEDED</PeelSticker>
          </div>
          <Chip className="border-[#1B2340]/30 text-[#1B2340]/70">00_5 — Start</Chip>
          <h2 className="font-poster text-5xl md:text-7xl mt-4 tracking-tighter leading-[0.9]">START SCANNING.</h2>
          <p className="mt-6 opacity-70 max-w-xl mx-auto text-lg">Five free scans on us. No credit card, no signup, no download — just paste and verify.</p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <MagneticButton>
              <button onClick={scrollToApp} className="btn-pill bg-[#1B2340] text-[#EEF1F6] text-base" data-testid="cta-open-app">
                Open the tool <ArrowRight size={16} className="inline ml-1" />
              </button>
            </MagneticButton>
            <MagneticButton>
              <Link to="/signup" className="btn-pill bg-[#FFD84D] text-[#1B2340] text-base" data-testid="cta-signup">
                Create free account
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>

      <footer className="bg-[#0F1428] text-[#EEF1F6]/60 py-8 text-center text-sm">
        © 2026 TrueLense · Browser-first · Made with real APIs
      </footer>

      <CornerSticker />
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import CheckerWorkspace from "@/components/CheckerWorkspace";
import PeelSticker from "@/components/PeelSticker";
import PopHeading from "@/components/PopHeading";
import MagneticButton from "@/components/MagneticButton";

/* Big rotating word marquee — pop-art motif */
function WordStrip({ items, color = "#1B2340", bg = "#FFD84D", speed = 22 }) {
  const row = [...items, ...items, ...items];
  return (
    <div className="w-full overflow-hidden py-4" style={{ background: bg, color, borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      <motion.div
        className="flex gap-10 whitespace-nowrap font-poster text-3xl md:text-5xl"
        animate={{ x: [0, "-33.333%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {row.map((w, i) => (
          <span key={i} className="flex items-center gap-10">
            {w}
            <span className="text-xl opacity-60">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const scrollToApp = () => document.getElementById("app-section")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[#EEF1F6] text-[#1B2340] overflow-x-hidden">
      <Header />

      {/* HERO — pop art editorial */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 halftone">
        {/* Big color blocks behind hero */}
        <div className="absolute -top-10 -right-16 w-[420px] h-[420px] rounded-full bg-[#FFD84D] blur-2xl opacity-70 pointer-events-none" />
        <div className="absolute top-32 -left-24 w-[380px] h-[380px] rounded-full bg-[#7DE0B8] blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-[#FF7A6A] blur-3xl opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-10">
          {/* Left: giant stacked headline */}
          <div className="md:col-span-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1B2340] text-[#EEF1F6] text-xs label-tiny mb-6"
            >
              <Sparkles size={12} /> Now in public beta
            </motion.div>

            <div className="space-y-2 md:space-y-4">
              <PopHeading text="NOT" className="text-6xl md:text-8xl" />
              <PopHeading text="EVERYTHING" className="text-6xl md:text-8xl" delay={0.15} />
              <PopHeading text="YOU SEE" className="text-6xl md:text-8xl" delay={0.3} />
              <div className="flex items-end gap-4 flex-wrap">
                <PopHeading text="IS REAL." className="text-6xl md:text-8xl" delay={0.45} offset={false} />
                <PeelSticker color="coral" rotate={-8} size="md" testid="hero-sticker-real" className="mb-3">
                  100% AI-DETECT
                </PeelSticker>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-8 max-w-xl text-lg md:text-xl leading-relaxed"
            >
              Paste. Drop. Verify. TrueLense scans photos, articles, QR codes and payment screenshots for AI fingerprints — right in your browser. No download. Any device.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="mt-8 flex flex-wrap gap-4 items-center"
            >
              <MagneticButton>
                <button onClick={scrollToApp} className="btn-pill bg-[#1B2340] text-[#EEF1F6] hover:bg-[#0F1428] text-base" data-testid="try-it-free-btn">
                  Try it free <ArrowRight size={16} className="inline ml-1" />
                </button>
              </MagneticButton>
              <MagneticButton>
                <Link to="/pricing" className="btn-pill bg-white text-[#1B2340] hairline hover:bg-[#F7F9FC] text-base" data-testid="hero-pricing-btn">
                  See pricing
                </Link>
              </MagneticButton>
              <span className="font-mono text-xs opacity-60">5 free scans, no signup</span>
            </motion.div>
          </div>

          {/* Right: sticker board */}
          <div className="md:col-span-4 relative min-h-[420px]">
            <div className="absolute top-2 left-4">
              <PeelSticker color="yellow" rotate={-8} size="lg" testid="sticker-fake">FAKE?</PeelSticker>
            </div>
            <div className="absolute top-24 right-2">
              <PeelSticker color="mint" rotate={9} size="md">REAL ✓</PeelSticker>
            </div>
            <div className="absolute top-52 left-8">
              <PeelSticker color="navy" rotate={-4} size="md">SCAN NOW</PeelSticker>
            </div>
            <div className="absolute top-80 right-6">
              <PeelSticker color="coral" rotate={6} size="md">AI-GEN?</PeelSticker>
            </div>
            <div className="absolute top-[26rem] left-2">
              <PeelSticker color="paper" rotate={-3} size="sm">DRAG ME</PeelSticker>
            </div>
          </div>
        </div>
      </section>

      {/* Big pop word strip */}
      <WordStrip
        items={["VERIFY TEXT", "SPOT AI IMAGES", "SCAN URLS", "QR SAFETY", "PAYMENT-SS", "IN YOUR BROWSER"]}
        color="#1B2340"
        bg="#FFD84D"
      />

      {/* App tool section */}
      <section id="app-section" className="relative py-20 md:py-28 bg-[#EEF1F6] paper-tex">
        <div className="max-w-7xl mx-auto px-6 mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="label-tiny opacity-60">The tool</div>
            <PopHeading text="VERIFY. RIGHT NOW." className="text-4xl md:text-6xl mt-2" offset={false} />
          </div>
          <div className="flex gap-3 flex-wrap">
            <PeelSticker color="mint" rotate={-4} size="sm" draggable={false}>GREEN = REAL</PeelSticker>
            <PeelSticker color="red" rotate={3} size="sm" draggable={false}>RED = FLAGGED</PeelSticker>
          </div>
        </div>
        <CheckerWorkspace />
      </section>

      {/* Bento pop panels */}
      <section className="relative bg-[#1B2340] text-[#EEF1F6] py-20 md:py-28 halftone-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14 flex items-end justify-between flex-wrap gap-6">
            <PopHeading text="WHY US?" className="text-5xl md:text-7xl text-[#EEF1F6]" offset={false} />
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
              <p className="mt-3 opacity-85">Runs on phones, iPads, laptops and classroom smart boards.</p>
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

      {/* Big CTA strip */}
      <WordStrip
        items={["TRUELENSE", "NOT REAL?", "PROVE IT.", "TRUELENSE", "SCAN IT.", "SHIP IT."]}
        color="#EEF1F6"
        bg="#1B2340"
        speed={28}
      />

      <section className="relative py-24 bg-[#EEF1F6] paper-tex text-center">
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="absolute -top-6 left-1/4 -rotate-6">
            <PeelSticker color="coral" size="md" draggable={false}>FREE FOREVER PLAN</PeelSticker>
          </div>
          <div className="absolute -top-2 right-1/4 rotate-6">
            <PeelSticker color="mint" size="md" draggable={false}>NO CARD NEEDED</PeelSticker>
          </div>
          <PopHeading text="START SCANNING." className="text-5xl md:text-7xl" offset={false} />
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
        © 2026 TrueLense · Built browser-first.
      </footer>
    </div>
  );
}

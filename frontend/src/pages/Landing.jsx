import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Zap, QrCode, Receipt, Type as TypeIcon, ImageIcon, Link2 as LinkIcon } from "lucide-react";
import Hero3D from "@/components/Hero3D";
import Header from "@/components/Header";
import CheckerWorkspace from "@/components/CheckerWorkspace";

const chips = ["Text", "Image", "URL", "QR Code", "Payment SS", "No download"];

export default function Landing() {
  const scrollToApp = () => {
    document.getElementById("app-section")?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div className="min-h-screen grain">
      <Header dark />
      {/* Hero */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        <Hero3D />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 grid md:grid-cols-12 gap-10 w-full">
          <div className="md:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-dark text-[#EEF1F6] text-xs label-tiny mb-6"
            >
              <Sparkles size={12} /> Now in public beta
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.05 }}
              className="font-display text-[#EEF1F6] text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tighter"
              data-testid="hero-headline"
            >
              Not everything you see is real.
              <br />
              <span className="text-[#2F8F6F]">Now you can prove it.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15 }}
              className="text-[#EEF1F6]/85 text-lg md:text-xl mt-6 max-w-2xl leading-relaxed"
            >
              TrueLense verifies photos, statements, articles, QR codes and payment screenshots — right in your browser. No app to install. Works on your phone, laptop, iPad or the classroom smart board.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="flex flex-wrap gap-3 mt-8"
            >
              <button onClick={scrollToApp} className="btn-pill bg-[#EEF1F6] text-[#1B2340] hover:bg-white text-base" data-testid="try-it-free-btn">
                Try it free <ArrowRight size={16} className="inline ml-1" />
              </button>
              <Link to="/pricing" className="btn-pill bg-white/10 text-[#EEF1F6] hover:bg-white/20 text-base" data-testid="hero-pricing-btn">
                See pricing
              </Link>
            </motion.div>
            <div className="flex flex-wrap gap-2 mt-8" data-testid="hero-chips">
              {chips.map((c, i) => (
                <motion.span
                  key={c}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="px-3 py-1 rounded-full hairline-dark text-[#EEF1F6]/80 text-xs"
                >
                  {c}
                </motion.span>
              ))}
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col justify-end gap-4">
            {[
              { icon: TypeIcon, label: "Text", color: "#EEF1F6" },
              { icon: ImageIcon, label: "Image", color: "#2F8F6F" },
              { icon: LinkIcon, label: "URL", color: "#8AB4F8" },
              { icon: QrCode, label: "QR", color: "#E5A24A" },
              { icon: Receipt, label: "Payment", color: "#C1443B" },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="glass-dark rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: f.color }}>
                  <f.icon size={18} className="text-[#1B2340]" />
                </div>
                <div>
                  <div className="text-[#EEF1F6] font-semibold">{f.label} checker</div>
                  <div className="text-[#EEF1F6]/60 text-xs">Verdict in seconds</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-[#1B2340] py-6 overflow-hidden border-y border-white/5">
        <div className="marquee text-[#EEF1F6]/50 font-display text-2xl">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-12 items-center">
              <span>Verify text</span><span>·</span>
              <span>Detect AI images</span><span>·</span>
              <span>Scan articles from a URL</span><span>·</span>
              <span>Scan QR safely</span><span>·</span>
              <span>Spot fake payments</span><span>·</span>
              <span>Runs in any browser</span><span>·</span>
            </div>
          ))}
        </div>
      </div>

      {/* App section - real tool right here */}
      <section id="app-section" className="bg-[#EEF1F6] py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
          <div className="label-tiny opacity-60">The Tool</div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[#1B2340] mt-2">Verify anything, right now.</h2>
          <p className="opacity-70 mt-3 max-w-2xl mx-auto">Pick a checker, drop your file, get a verdict with confidence. Five free scans on the house.</p>
        </div>
        <CheckerWorkspace />
      </section>

      {/* Trust section */}
      <section className="bg-[#1B2340] text-[#EEF1F6] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: "Real detection engines", desc: "Winston AI for text, Sightengine for images. Not vibes — actual APIs." },
            { icon: Zap, title: "Fast & lightweight", desc: "Runs in-browser. Zero install on phones, TVs or classroom boards." },
            { icon: Sparkles, title: "Simple verdicts", desc: "Green means real. Red means flagged. Confidence % on every result." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-dark rounded-3xl p-8"
            >
              <f.icon size={28} className="text-[#2F8F6F] mb-4" />
              <h3 className="font-display text-2xl font-bold mb-2">{f.title}</h3>
              <p className="opacity-75">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="bg-[#0F1428] text-[#EEF1F6]/60 py-8 text-center text-sm">
        © 2026 TrueLense · Built for a browser-first world.
      </footer>
    </div>
  );
}

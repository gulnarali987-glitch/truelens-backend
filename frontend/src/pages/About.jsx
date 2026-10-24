import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { Phone, Mail, ShieldCheck, Type, ImageIcon, Link2, QrCode, Receipt } from "lucide-react";

// ---- Edit these if you want to personalise the page ----
const FOUNDER_NAME = "Aafiya Ali";
const FOUNDER_BIO =
  "I'm Aafiya, the founder of TrueLense. I started building it after seeing how easily AI-made images, text and fake payment screenshots can fool even careful people. I wanted one simple place where anyone can check before they trust, without needing any technical knowledge.";
// Leave empty ("") to hide the email row.
const CONTACT_EMAIL = "truelense.offical@gmail.com";
const PHONES = [
  { display: "+91 74289 18910", href: "tel:+917428918910" },
  { display: "+91 78381 52006", href: "tel:+917838152006" },
];
// --------------------------------------------------------

const CHECKS = [
  { icon: Type, title: "Text", desc: "Find out whether a passage looks AI-written or human-written." },
  { icon: ImageIcon, title: "Images", desc: "Spot photos that were likely generated or altered by AI." },
  { icon: Link2, title: "Article links", desc: "Paste a URL and we scan the main article text only." },
  { icon: QrCode, title: "QR codes", desc: "Check where a QR code really leads before you scan and pay." },
  { icon: Receipt, title: "Payment screenshots", desc: "Detect screenshots that look edited or manipulated." },
];

const STEPS = [
  { n: "01", title: "Add what you want to check", desc: "Paste text or a link, or upload an image, QR code or screenshot." },
  { n: "02", title: "We analyse it", desc: "Your input is checked by specialised AI-detection services." },
  { n: "03", title: "You get a clear result", desc: "A verdict, a confidence score and plain-language reasons." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <div className="max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="label-tiny opacity-60">About us</div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[#1B2340] mt-2 tracking-tighter" data-testid="about-heading">
            Know what's real. Instantly.
          </h1>
          <p className="opacity-70 mt-4 max-w-2xl text-lg">
            TrueLense helps you check whether text, images, links, QR codes and payment screenshots can be trusted, in seconds.
          </p>
        </motion.div>

        {/* Founder */}
        <div className="grid md:grid-cols-5 gap-6 mt-12">
          <div className="md:col-span-3 glass rounded-3xl p-8" data-testid="about-founder">
            <div className="label-tiny opacity-60">Meet the founder</div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1B2340] mt-1">{FOUNDER_NAME}</h2>
            <div className="text-sm opacity-60 mt-1">Founder, TrueLense · India</div>
            <p className="mt-4 opacity-80 leading-relaxed">{FOUNDER_BIO}</p>
            <p className="mt-4 opacity-80 leading-relaxed">
              TrueLense is built and run independently, and it keeps improving with feedback from the people who use it.
            </p>
          </div>

          <div className="md:col-span-2 bg-[#1B2340] text-[#EEF1F6] rounded-3xl p-8">
            <div className="label-tiny opacity-60">Our mission</div>
            <p className="font-display text-2xl font-bold mt-2 leading-snug">
              Trust shouldn't be a guess.
            </p>
            <p className="opacity-70 mt-3 text-sm">
              In a world where anything can be made to look real, everyone deserves a simple way to check.
            </p>
          </div>
        </div>

        {/* What we check */}
        <div className="mt-14">
          <div className="label-tiny opacity-60">What you can check</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {CHECKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white hairline rounded-3xl p-6">
                <Icon size={20} className="text-[#2F8F6F] mb-3" />
                <div className="font-display text-lg font-bold text-[#1B2340]">{title}</div>
                <p className="text-sm opacity-70 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-14">
          <div className="label-tiny opacity-60">How it works</div>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {STEPS.map((s) => (
              <div key={s.n} className="glass rounded-3xl p-6">
                <div className="font-mono text-sm text-[#E5A24A] font-semibold">{s.n}</div>
                <div className="font-display text-lg font-bold text-[#1B2340] mt-2">{s.title}</div>
                <p className="text-sm opacity-70 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Honest note */}
        <div className="mt-14 glass rounded-3xl p-8 flex gap-4 items-start">
          <ShieldCheck size={22} className="text-[#2F8F6F] shrink-0 mt-1" />
          <div>
            <div className="font-display text-xl font-bold text-[#1B2340]">An honest note</div>
            <p className="opacity-80 mt-2 leading-relaxed">
              No AI detector is perfect. TrueLense gives you a strong signal, not a guarantee, so use it as one input in your decision.
              For payments, always confirm in your own bank or UPI app that the money has actually arrived.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-14 bg-white hairline rounded-3xl p-8" data-testid="about-contact">
          <div className="label-tiny opacity-60">Contact us</div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1B2340] mt-1">We'd love to hear from you</h2>
          <p className="opacity-70 mt-2">Questions, feedback or billing help? Call us.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {PHONES.map((p) => (
              <a
                key={p.href}
                href={p.href}
                className="btn-pill bg-[#1B2340] text-[#EEF1F6] inline-flex items-center justify-center gap-2"
                data-testid="about-phone"
              >
                <Phone size={16} /> {p.display}
              </a>
            ))}
            {CONTACT_EMAIL && (
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="btn-pill bg-[#1B2340]/5 text-[#1B2340] inline-flex items-center justify-center gap-2"
              >
                <Mail size={16} /> {CONTACT_EMAIL}
              </a>
            )}
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link to="/app" className="btn-pill inline-block bg-[#1B2340] text-[#EEF1F6]" data-testid="about-cta">
            Try TrueLense free
          </Link>
          <div className="mt-3 text-sm opacity-60">
            Have a question? Read the <Link to="/faq" className="underline">FAQ</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}

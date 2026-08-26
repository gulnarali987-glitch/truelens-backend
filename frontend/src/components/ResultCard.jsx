import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import TiltCard from "@/components/TiltCard";

function Meter({ value, negative }) {
  return (
    <div className="w-full h-3 rounded-full bg-black/5 overflow-hidden" data-testid="confidence-meter">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.1 }}
        className={`h-full ${negative ? "bg-[#C1443B]" : "bg-[#2F8F6F]"}`}
      />
    </div>
  );
}

export default function ResultCard({ result, checker }) {
  if (!result) return null;

  const isPayment = checker === "payment";
  const isQR = checker === "qr";
  let title, sub, negative, confidence, extra = null;

  if (isQR) {
    const v = result.verdict;
    negative = v === "unsafe";
    const caution = v === "caution";
    title = v === "safe" ? "Looks Safe" : caution ? "Use Caution" : "Do NOT Open";
    sub = result.decoded_url;
    confidence = 100;
    extra = (
      <div className="mt-4 space-y-3">
        {result.analysis?.reasons?.length > 0 && (
          <div>
            <div className="label-tiny text-[#C1443B] mb-2">Risks</div>
            <ul className="space-y-1 text-sm">
              {result.analysis.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2"><ShieldAlert size={14} className="mt-0.5 text-[#C1443B] shrink-0" /><span>{r}</span></li>
              ))}
            </ul>
          </div>
        )}
        {result.analysis?.warnings?.length > 0 && (
          <div>
            <div className="label-tiny text-[#E5A24A] mb-2">Warnings</div>
            <ul className="space-y-1 text-sm">
              {result.analysis.warnings.map((r, i) => (
                <li key={i} className="flex items-start gap-2"><AlertTriangle size={14} className="mt-0.5 text-[#E5A24A] shrink-0" /><span>{r}</span></li>
              ))}
            </ul>
          </div>
        )}
        {result.analysis?.upi && Object.keys(result.analysis.upi).length > 0 && (
          <div className="rounded-2xl bg-[#EEF1F6] p-4 text-sm">
            <div className="label-tiny mb-2">UPI Intent</div>
            <div className="font-mono text-xs space-y-1">
              {Object.entries(result.analysis.upi).map(([k, v]) => (
                <div key={k}><span className="opacity-60">{k}:</span> {String(v)}</div>
              ))}
            </div>
          </div>
        )}
        <div className="text-xs opacity-70 italic">{result.reminder}</div>
      </div>
    );
    return (
      <ResultShell negative={negative || caution} title={title} sub={sub} confidence={null}>
        {extra}
      </ResultShell>
    );
  }

  negative = result.verdict === "ai";
  title = negative ? "Likely AI-Generated" : "Likely Authentic";
  sub = negative
    ? "Our detector thinks this content shows signs of AI generation."
    : "Our detector thinks this content is genuine.";
  confidence = result.confidence;

  const isUrl = checker === "url";

  return (
    <ResultShell negative={negative} title={title} sub={sub} confidence={confidence}>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="label-tiny mb-1 opacity-70">AI probability</div>
          <div className="font-display text-2xl font-bold" data-testid="ai-prob">{result.ai_probability}%</div>
        </div>
        <div>
          <div className="label-tiny mb-1 opacity-70">Human probability</div>
          <div className="font-display text-2xl font-bold" data-testid="human-prob">{result.human_probability}%</div>
        </div>
      </div>
      {isUrl && (
        <div className="mt-5 rounded-2xl bg-white/70 hairline p-4" data-testid="url-details">
          {result.title && <div className="font-display text-base font-bold text-[#1B2340] leading-snug">{result.title}</div>}
          <a href={result.source_url} target="_blank" rel="noreferrer" className="text-xs opacity-60 break-all hover:underline">
            {result.source_url}
          </a>
          <div className="text-xs opacity-60 mt-1">
            Scanned {result.word_count?.toLocaleString?.() ?? result.word_count} words
            {result.scanned_chars ? ` · ${(result.scanned_chars).toLocaleString()} chars` : ""}
          </div>
          {result.excerpt && (
            <div className="mt-3 text-sm opacity-80 italic leading-relaxed">“{result.excerpt}”</div>
          )}
        </div>
      )}
      {isPayment && result.disclaimer && (
        <div className="mt-5 rounded-2xl bg-[#E5A24A]/15 border border-[#E5A24A]/40 p-4 text-sm text-[#8a5a1e]" data-testid="payment-disclaimer">
          <AlertTriangle size={16} className="inline mr-1" /> {result.disclaimer}
        </div>
      )}
    </ResultShell>
  );
}

function ResultShell({ negative, title, sub, confidence, children }) {
  return (
    <AnimatePresence>
      <motion.div
        key={title}
        initial={{ opacity: 0, y: 24, scale: 0.94, rotateX: -8 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        style={{ transformStyle: "preserve-3d" }}
        data-testid="result-card"
      >
        <TiltCard max={8} glare className={`relative rounded-3xl p-6 md:p-8 ${negative ? "bg-[#C1443B]/8" : "bg-[#2F8F6F]/8"} hairline`}>
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className={`h-12 w-12 rounded-full flex items-center justify-center ${negative ? "bg-[#C1443B] text-white" : "bg-[#2F8F6F] text-white"} shadow-lg`}
            >
              {negative ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
            </motion.div>
            <div>
              <div className={`font-display text-2xl md:text-3xl font-bold ${negative ? "text-[#C1443B]" : "text-[#2F8F6F]"}`} data-testid="result-verdict">
                {title}
              </div>
              <div className="text-sm opacity-70">{sub}</div>
            </div>
          </div>
          {confidence != null && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="label-tiny opacity-70">Confidence</span>
                <span className="font-mono text-sm font-bold" data-testid="confidence-value">{confidence}%</span>
              </div>
              <Meter value={confidence} negative={negative} />
            </>
          )}
          {children}
        </TiltCard>
      </motion.div>
    </AnimatePresence>
  );
}

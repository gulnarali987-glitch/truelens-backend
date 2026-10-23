import React, { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Dropzone from "@/components/Dropzone";
import ResultCard from "@/components/ResultCard";
import MagneticButton from "@/components/MagneticButton";
import { Type, ImageIcon, QrCode, Receipt, Loader2, Link2 } from "lucide-react";

// Minimum characters needed for a reliable AI-text result (Winston AI's limit).
// Change this one number to adjust.
const MIN_CHARS = 300;

const TABS = [
  { id: "text", label: "Text", icon: Type, hint: `Paste at least ${MIN_CHARS} characters for accurate results` },
  { id: "image", label: "Image", icon: ImageIcon, hint: "Upload a photo to detect AI generation" },
  { id: "url", label: "URL", icon: Link2, hint: "Paste an article URL — we scan the main content only" },
  { id: "qr", label: "QR Code", icon: QrCode, hint: "Upload a QR image or paste the decoded link" },
  { id: "payment", label: "Payment SS", icon: Receipt, hint: "Upload a payment screenshot to detect edits" },
];

// Sample results shown in the "Example" section. Shapes mirror the real API responses.
const EXAMPLES = {
  text: {
    input: "\"In today's fast-paced digital landscape, leveraging innovative solutions is essential for unlocking sustainable growth and fostering meaningful engagement…\"",
    result: {
      verdict: "ai",
      ai_probability: 92.4,
      human_probability: 7.6,
      confidence: 92.4,
      details: { raw: { score: 7.6, words: 62 } },
      checker: "text",
    },
  },
  image: {
    input: "A photo of a mountain lake at sunrise.",
    result: {
      verdict: "ai",
      ai_probability: 87.4,
      human_probability: 12.6,
      confidence: 87.4,
      details: { raw: { ai_generated: 0.874 } },
      checker: "image",
    },
  },
  url: {
    input: "https://example.com/blog/how-remote-teams-stay-productive",
    result: {
      verdict: "real",
      ai_probability: 18.2,
      human_probability: 81.8,
      confidence: 81.8,
      source_url: "https://example.com/blog/how-remote-teams-stay-productive",
      title: "How Remote Teams Stay Productive",
      word_count: 640,
      scanned_chars: 3800,
      excerpt: "Working from home changed how teams plan their week. Instead of long meetings, the best teams we spoke to rely on short daily notes and clear ownership…",
      checker: "url",
    },
  },
  qr: {
    input: "A QR code that opens http://bit.ly/pay-now-123",
    result: {
      verdict: "unsafe",
      decoded_url: "http://bit.ly/pay-now-123",
      analysis: {
        safe: false,
        reasons: [
          "Uses HTTP (not encrypted) — could be intercepted",
          "Uses URL shortener (bit.ly) — destination hidden",
        ],
        warnings: [],
        url: "http://bit.ly/pay-now-123",
        host: "bit.ly",
        scheme: "http",
        upi: null,
      },
      reminder: "Always double-check in your banking or UPI app before paying.",
      checker: "qr",
    },
  },
  payment: {
    input: "A screenshot of a UPI payment confirmation.",
    result: {
      verdict: "real",
      ai_probability: 11.8,
      human_probability: 88.2,
      confidence: 88.2,
      details: { raw: { ai_generated: 0.118 } },
      disclaimer:
        "This only checks if the screenshot looks AI-edited or manipulated. It does NOT confirm the transaction actually happened. Always verify in your bank or UPI app.",
      checker: "payment",
    },
  },
};

export default function CheckerWorkspace() {
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [qrUrl, setQrUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const current = TABS.find(t => t.id === tab);
  const example = EXAMPLES[tab];

  // Live character count (instant, no server call)
  const charCount = text.trim().length;
  const enoughChars = charCount >= MIN_CHARS;
  const charsLeft = Math.max(0, MIN_CHARS - charCount);

  const handleQuotaError = (err) => {
    const d = err?.response?.data?.detail || err?.response?.data;
    if (err?.response?.status === 402) {
      if (d?.error === "anon_limit" || d?.error === "quota_exceeded") {
        toast.error(d.error === "anon_limit" ? "Free trial used up — sign up to keep going." : "Monthly limit reached — upgrade your plan.");
        setTimeout(() => navigate(d.error === "anon_limit" ? "/signup" : "/pricing"), 900);
        return true;
      }
    }
    return false;
  };

  const run = async () => {
    setResult(null);
    setLoading(true);
    try {
      let data;
      if (tab === "text") {
        if (!enoughChars) {
          toast.error(`Please enter at least ${MIN_CHARS} characters. You have ${charCount} so far.`);
          setLoading(false);
          return;
        }
        ({ data } = await api.post("/check/text", { text }));
      } else if (tab === "image") {
        if (!file) { toast.error("Please pick an image"); setLoading(false); return; }
        const fd = new FormData(); fd.append("file", file);
        ({ data } = await api.post("/check/image", fd, { headers: { "Content-Type": "multipart/form-data" } }));
      } else if (tab === "url") {
        if (!pageUrl.trim() || pageUrl.trim().length < 4) { toast.error("Please paste a valid URL"); setLoading(false); return; }
        ({ data } = await api.post("/check/url", { url: pageUrl.trim() }));
      } else if (tab === "qr") {
        if (!file && !qrUrl.trim()) { toast.error("Provide a QR image or paste a URL"); setLoading(false); return; }
        const fd = new FormData();
        if (file) fd.append("file", file);
        if (qrUrl.trim()) fd.append("url", qrUrl.trim());
        ({ data } = await api.post("/check/qr", fd, { headers: { "Content-Type": "multipart/form-data" } }));
      } else if (tab === "payment") {
        if (!file) { toast.error("Please upload a payment screenshot"); setLoading(false); return; }
        const fd = new FormData(); fd.append("file", file);
        ({ data } = await api.post("/check/payment", fd, { headers: { "Content-Type": "multipart/form-data" } }));
      }
      setResult(data);
      if (user) refresh();
    } catch (err) {
      if (!handleQuotaError(err)) {
        toast.error(err?.response?.data?.detail || err?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetInputs = () => { setFile(null); setText(""); setQrUrl(""); setPageUrl(""); setResult(null); };

  const textBlocked = tab === "text" && !enoughChars;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6">
      {/* Tabs */}
      <LayoutGroup>
        <div className="flex flex-wrap gap-2 p-2 bg-white/70 hairline rounded-full mb-8 relative" data-testid="checker-tabs">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); resetInputs(); }}
                className="relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 hover:scale-[1.03] active:scale-[0.97]"
                style={{ transition: "transform 180ms cubic-bezier(0.22,1,0.36,1), color 180ms ease" }}
                data-testid={`tab-${t.id}`}
              >
                {active && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-[#1B2340] rounded-full -z-10 shadow-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  />
                )}
                <motion.span
                  animate={active ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex"
                >
                  <Icon size={16} className={active ? "text-[#EEF1F6]" : "text-[#1B2340]"} />
                </motion.span>
                <span className={active ? "text-[#EEF1F6]" : "text-[#1B2340]"}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-6 md:p-8"
          >
            <div className="mb-4">
              <div className="label-tiny opacity-60">{current.hint}</div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#1B2340] mt-1">Check {current.label}</h2>
            </div>

            {tab === "url" && (
              <div className="space-y-4">
                <Input
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="https://example.com/some-article"
                  className="rounded-full h-14 px-6 text-base"
                  data-testid="url-input"
                  autoComplete="off"
                />
                <div className="rounded-2xl bg-[#EEF1F6] p-4 text-sm opacity-80">
                  We fetch the page, strip out menus, ads, sidebars and footers, then scan only the main article text. Best on news articles, blog posts, and long-form pages.
                </div>
              </div>
            )}
            {tab === "text" && (
              <div>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Paste the text you want to verify here… Please use at least ${MIN_CHARS} characters for accurate results.`}
                  className="min-h-[220px] rounded-2xl text-base"
                  data-testid="text-input"
                />
                <div className="flex items-center justify-between mt-3 text-sm" data-testid="char-counter">
                  <span className={`font-mono font-semibold ${enoughChars ? "text-[#2F8F6F]" : "text-[#C1443B]"}`}>
                    {charCount} / {MIN_CHARS} characters
                  </span>
                  <span className={enoughChars ? "text-[#2F8F6F]" : "opacity-70"}>
                    {enoughChars
                      ? "Good to go — ready to verify"
                      : charCount === 0
                        ? `Minimum ${MIN_CHARS} characters needed`
                        : `${charsLeft} more character${charsLeft === 1 ? "" : "s"} needed`}
                  </span>
                </div>
              </div>
            )}
            {(tab === "image" || tab === "payment") && (
              <Dropzone
                onFile={setFile}
                testid={tab === "image" ? "image-drop" : "payment-drop"}
                label={tab === "payment" ? "Drop payment screenshot here" : "Drop an image, tap to upload"}
              />
            )}
            {tab === "qr" && (
              <div className="space-y-4">
                <Dropzone onFile={setFile} testid="qr-drop" label="Drop a QR code image here" />
                <div className="text-center text-sm opacity-60 label-tiny">or</div>
                <Input
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                  placeholder="Paste the decoded QR URL (e.g. upi://pay?pa=... or https://...)"
                  className="rounded-full h-12 px-6"
                  data-testid="qr-url-input"
                />
              </div>
            )}

            <MagneticButton strength={0.25}>
              <button
                onClick={run}
                disabled={loading || textBlocked}
                className="btn-pill mt-6 bg-[#1B2340] text-[#EEF1F6] hover:bg-[#0F1428] disabled:opacity-60 w-full md:w-auto flex items-center justify-center gap-2"
                data-testid="verify-btn"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Verifying…" : `Verify ${current.label}`}
              </button>
            </MagneticButton>
          </motion.div>
        </div>
        <div className="md:col-span-2">
          {result ? (
            <ResultCard result={result} checker={tab} />
          ) : (
            <div className="glass rounded-3xl p-6 md:p-8 h-full" data-testid="result-placeholder">
              <div className="label-tiny opacity-60 mb-2">Result</div>
              <h3 className="font-display text-xl font-bold text-[#1B2340]">Nothing to show yet</h3>
              <p className="text-sm opacity-70 mt-2">Run a check to see the verdict, confidence score and reasoning here.</p>
              <div className="mt-6 space-y-2 text-sm opacity-70">
                <p>• <span className="font-semibold text-[#2F8F6F]">Green</span> = looks authentic.</p>
                <p>• <span className="font-semibold text-[#C1443B]">Red</span> = signs of AI or risk.</p>
                <p>• You get 5 free scans without an account.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Example section: sits below the checker, changes with the selected tab */}
      <motion.div
        key={`example-${tab}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 glass rounded-3xl p-6 md:p-8"
        data-testid="example-section"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="label-tiny opacity-60">See how it works</div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-[#1B2340] mt-1">
              Example: {current.label} check
            </h3>
          </div>
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#E5A24A]/20 text-[#8A5A12] shrink-0">
            SAMPLE
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="rounded-2xl bg-[#EEF1F6] p-5">
            <div className="label-tiny opacity-60 mb-2">Sample input</div>
            <p className="text-sm opacity-80" data-testid="example-input">{example.input}</p>
          </div>
          <div data-testid="example-result">
            <ResultCard result={example.result} checker={tab} />
          </div>
        </div>

        <p className="text-xs opacity-60 mt-5">
          This is only a sample to show how results look. Run your own check above to get a real result.
        </p>
      </motion.div>
    </div>
  );
}

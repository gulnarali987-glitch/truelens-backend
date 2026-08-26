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
import { Type, ImageIcon, QrCode, Receipt, Loader2, Link2 } from "lucide-react";

const TABS = [
  { id: "text", label: "Text", icon: Type, hint: "Paste ~50+ words for best accuracy" },
  { id: "image", label: "Image", icon: ImageIcon, hint: "Upload a photo to detect AI generation" },
  { id: "url", label: "URL", icon: Link2, hint: "Paste an article URL — we scan the main content only" },
  { id: "qr", label: "QR Code", icon: QrCode, hint: "Upload a QR image or paste the decoded link" },
  { id: "payment", label: "Payment SS", icon: Receipt, hint: "Upload a payment screenshot to detect edits" },
];

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
        if (text.trim().length < 10) { toast.error("Please paste at least a few sentences"); setLoading(false); return; }
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
                className="relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-sm font-semibold transition-colors z-10"
                data-testid={`tab-${t.id}`}
              >
                {active && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-[#1B2340] rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  />
                )}
                <Icon size={16} className={active ? "text-[#EEF1F6]" : "text-[#1B2340]"} />
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
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the text you want to verify here… For accurate results, use at least 50 words."
                className="min-h-[220px] rounded-2xl text-base"
                data-testid="text-input"
              />
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

            <button
              onClick={run}
              disabled={loading}
              className="btn-pill mt-6 bg-[#1B2340] text-[#EEF1F6] hover:bg-[#0F1428] disabled:opacity-60 w-full md:w-auto flex items-center justify-center gap-2"
              data-testid="verify-btn"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Verifying…" : `Verify ${current.label}`}
            </button>
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
    </div>
  );
}

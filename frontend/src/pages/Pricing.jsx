import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const PLANS = [
  { id: "free",       name: "Free",       usd: 0,  inr: 0,     inr_year: 0,     tag: "Try it",       features: ["5 checks / month", "All 5 checkers", "No credit card"],           cta: "You're here" },
  { id: "starter",    name: "Starter",    usd: 9,  inr: 799,   inr_year: 7670,  tag: "Individuals",  features: ["100 checks / month", "All 5 checkers", "Email support"],           cta: "Get Starter" },
  { id: "business",   name: "Business",   usd: 29, inr: 2499,  inr_year: 23990, tag: "Most popular", features: ["Unlimited checks", "Priority processing", "Priority support"],     cta: "Get Business", featured: true },
  { id: "enterprise", name: "Enterprise", usd: 99, inr: 8299,  inr_year: 79670, tag: "Teams",        features: ["Unlimited checks", "API access", "Team accounts (coming)"],        cta: "Get Enterprise" },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.id = "razorpay-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [cycle, setCycle] = useState("monthly"); // "monthly" | "yearly"

  const subscribe = async (planId) => {
    if (!user) { navigate("/signup"); return; }
    if (planId === "free") return;
    setLoadingId(planId);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load Razorpay Checkout");

      const { data } = await api.post("/payments/checkout", { plan_id: planId, origin_url: window.location.origin, cycle });

      const rzp = new window.Razorpay({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: data.currency || "INR",
        name: "TrueLense",
        description: `${PLANS.find(p => p.id === planId)?.name} — ${cycle === "yearly" ? "yearly (365 days)" : "monthly (30 days)"}`,
        image: "/logo.png",
        theme: { color: "#1B2340" },
        prefill: {
          email: user.email || "",
          name: user.name || "",
        },
        notes: { plan_id: planId, cycle },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Payment verified — you're upgraded!");
            navigate(`/payment/success?order_id=${encodeURIComponent(resp.razorpay_order_id)}`);
          } catch (err) {
            toast.error(err?.response?.data?.detail || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => setLoadingId(null),
        },
      });
      rzp.on("payment.failed", (resp) => {
        toast.error(resp?.error?.description || "Payment failed");
        setLoadingId(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Checkout failed");
      setLoadingId(null);
    }
  };

  const priceFor = (p) => cycle === "yearly" ? p.inr_year : p.inr;
  const monthlyEquivalent = (p) => cycle === "yearly" && p.inr_year > 0 ? Math.round(p.inr_year / 12) : null;

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <div className="label-tiny opacity-60">Pricing</div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-[#1B2340] mt-2 tracking-tighter">Fair prices. Real detection.</h1>
          <p className="opacity-70 mt-3 max-w-xl mx-auto">Pick the plan that fits how often you verify. Upgrade or cancel anytime.</p>
        </div>

        {/* Cycle toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="flex p-1 rounded-full bg-white hairline"
            role="tablist"
            data-testid="cycle-toggle"
          >
            <button
              onClick={() => setCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${cycle === "monthly" ? "bg-[#1B2340] text-[#EEF1F6] shadow" : "text-[#1B2340]/70 hover:text-[#1B2340]"}`}
              data-testid="cycle-monthly"
              aria-pressed={cycle === "monthly"}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${cycle === "yearly" ? "bg-[#1B2340] text-[#EEF1F6] shadow" : "text-[#1B2340]/70 hover:text-[#1B2340]"}`}
              data-testid="cycle-yearly"
              aria-pressed={cycle === "yearly"}
            >
              Yearly
              <span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full ${cycle === "yearly" ? "bg-[#EEF1F6] text-[#2F8F6F]" : "bg-[#2F8F6F]/15 text-[#2F8F6F]"}`}>
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((p, i) => {
            const price = priceFor(p);
            const perMonth = monthlyEquivalent(p);
            const saveAmt = cycle === "yearly" && p.inr > 0 ? (p.inr * 12) - p.inr_year : 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-3xl p-8 flex flex-col ${p.featured ? "bg-[#1B2340] text-[#EEF1F6]" : "bg-white text-[#1B2340] hairline"}`}
                data-testid={`plan-${p.id}`}
              >
                <div className="label-tiny opacity-60 flex items-center gap-1">
                  {p.featured && <Sparkles size={12} />} {p.tag}
                </div>
                <div className="font-display text-3xl font-bold mt-2">{p.name}</div>
                <div className="mt-4">
                  <span className="font-display text-5xl font-black" data-testid={`price-${p.id}`}>
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  {price > 0 && (
                    <span className="opacity-60 ml-1">{cycle === "yearly" ? "/yr" : "/mo"}</span>
                  )}
                </div>
                {cycle === "yearly" && perMonth ? (
                  <div className={`text-xs mt-1 ${p.featured ? "text-[#EEF1F6]/70" : "opacity-60"}`}>
                    ≈ ₹{perMonth.toLocaleString("en-IN")} / mo · <span className="text-[#2F8F6F] font-semibold">save ₹{saveAmt.toLocaleString("en-IN")}</span>
                  </div>
                ) : p.usd > 0 ? (
                  <div className={`text-xs mt-1 ${p.featured ? "text-[#EEF1F6]/60" : "opacity-50"}`}>≈ ${p.usd} / month</div>
                ) : null}
                <ul className="mt-6 space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-[#2F8F6F] mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => subscribe(p.id)}
                  disabled={loadingId === p.id || (user && user.plan === p.id)}
                  className={`btn-pill mt-8 ${p.featured ? "bg-[#EEF1F6] text-[#1B2340]" : "bg-[#1B2340] text-[#EEF1F6]"} disabled:opacity-50 w-full`}
                  data-testid={`subscribe-${p.id}`}
                >
                  {user && user.plan === p.id ? "Current plan" : loadingId === p.id ? "Loading…" : p.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center opacity-60 text-sm mt-10">
          Live mode — real charges apply. Card, UPI and netbanking all supported by Razorpay.
        </div>
      </div>
    </div>
  );
}

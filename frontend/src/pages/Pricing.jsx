import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const PLANS = [
  { id: "free", name: "Free", price: 0, tag: "Try it", features: ["5 checks / month", "All 4 checkers", "No credit card"], cta: "You're here" },
  { id: "starter", name: "Starter", price: 9, tag: "Individuals", features: ["100 checks / month", "All 4 checkers", "Email support"], cta: "Get Starter" },
  { id: "business", name: "Business", price: 29, tag: "Most popular", features: ["Unlimited checks", "Priority processing", "Priority support"], cta: "Get Business", featured: true },
  { id: "enterprise", name: "Enterprise", price: 99, tag: "Teams", features: ["Unlimited checks", "API access", "Team accounts (coming)"], cta: "Get Enterprise" },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);

  const subscribe = async (planId) => {
    if (!user) { navigate("/signup"); return; }
    if (planId === "free") return;
    setLoadingId(planId);
    try {
      const { data } = await api.post("/payments/checkout", {
        plan_id: planId,
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Checkout failed");
    } finally { setLoadingId(null); }
  };

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="label-tiny opacity-60">Pricing</div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-[#1B2340] mt-2 tracking-tighter">Fair prices. Real detection.</h1>
          <p className="opacity-70 mt-3 max-w-xl mx-auto">Pick the plan that fits how often you verify. Upgrade or cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((p, i) => (
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
                <span className="font-display text-5xl font-black">${p.price}</span>
                {p.price > 0 && <span className="opacity-60 ml-1">/mo</span>}
              </div>
              <ul className="mt-6 space-y-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={16} className={p.featured ? "text-[#2F8F6F] mt-0.5 shrink-0" : "text-[#2F8F6F] mt-0.5 shrink-0"} />
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
          ))}
        </div>
        <div className="text-center opacity-60 text-sm mt-10">Test mode — use card <span className="font-mono">4242 4242 4242 4242</span>, any future date, any CVC.</div>
      </div>
    </div>
  );
}

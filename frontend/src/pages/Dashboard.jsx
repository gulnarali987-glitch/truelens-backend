import React, { useEffect } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Crown, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  if (!user) return null;
  const usage = user.usage || { used: 0, limit: 5, plan: "free" };
  const pct = usage.limit === -1 ? 0 : Math.min(100, Math.round((usage.used / Math.max(1, usage.limit)) * 100));
  const unlimited = usage.limit === -1;

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24 pb-20">
      <Header />
      <div className="max-w-6xl mx-auto px-6">
        <div className="label-tiny opacity-60">Dashboard</div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[#1B2340] mt-1" data-testid="dashboard-heading">
          Hi, {user.name || user.email.split("@")[0]}
        </h1>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8">
            <Crown size={20} className="text-[#2F8F6F] mb-3" />
            <div className="label-tiny opacity-60">Current plan</div>
            <div className="font-display text-3xl font-bold text-[#1B2340] mt-1 capitalize" data-testid="current-plan">{usage.plan}</div>
            <Link to="/pricing" className="btn-pill mt-5 inline-block bg-[#1B2340] text-[#EEF1F6] text-sm" data-testid="upgrade-btn">
              {usage.plan === "free" ? "Upgrade" : "Change plan"}
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass rounded-3xl p-8">
            <Zap size={20} className="text-[#E5A24A] mb-3" />
            <div className="label-tiny opacity-60">Checks this month</div>
            <div className="font-display text-3xl font-bold text-[#1B2340] mt-1" data-testid="checks-used">
              {usage.used}{unlimited ? "" : ` / ${usage.limit}`}
            </div>
            {!unlimited && (
              <div className="mt-4 h-2 rounded-full bg-black/10 overflow-hidden">
                <div className="h-full bg-[#2F8F6F]" style={{ width: `${pct}%` }} />
              </div>
            )}
            {unlimited && <div className="text-sm text-[#2F8F6F] font-semibold mt-3">Unlimited on {usage.plan}</div>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-3xl p-8">
            <RefreshCw size={20} className="text-[#1B2340] mb-3" />
            <div className="label-tiny opacity-60">Billing</div>
            <div className="text-sm opacity-70 mt-1">Manage subscription, invoices and payment method in your Stripe portal.</div>
            <a href="mailto:support@truelense.app" className="btn-pill mt-5 inline-block bg-[#1B2340]/5 text-[#1B2340] text-sm" data-testid="manage-billing">
              Contact billing
            </a>
          </motion.div>
        </div>

        <div className="mt-10 glass rounded-3xl p-8">
          <h2 className="font-display text-2xl font-bold text-[#1B2340]">Ready to verify something?</h2>
          <p className="opacity-70 mt-1">Open the workspace and check text, images, QR codes or payment screenshots.</p>
          <Link to="/app" className="btn-pill inline-block mt-5 bg-[#1B2340] text-[#EEF1F6]" data-testid="go-to-app">
            Open workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

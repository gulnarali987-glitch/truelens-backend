import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("polling");
  const [attempts, setAttempts] = useState(0);
  const { refresh } = useAuth();

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          setStatus("paid");
          refresh();
          return;
        }
        if (data.status === "expired" || data.payment_status === "failed") {
          setStatus("failed");
          return;
        }
        tries += 1;
        setAttempts(tries);
        if (tries >= 15) { setStatus("timeout"); return; }
        setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, refresh]);

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="glass rounded-3xl p-8 text-center">
          {status === "polling" && (
            <>
              <Loader2 size={40} className="animate-spin mx-auto text-[#1B2340]" />
              <h1 className="font-display text-2xl font-bold mt-4">Confirming your payment…</h1>
              <p className="opacity-70 mt-2 text-sm">Poll {attempts}/15 · This is instant on card, may take a bit longer for other methods.</p>
            </>
          )}
          {status === "paid" && (
            <>
              <CheckCircle2 size={48} className="mx-auto text-[#2F8F6F]" />
              <h1 className="font-display text-3xl font-bold mt-4 text-[#2F8F6F]" data-testid="payment-success">You're upgraded!</h1>
              <p className="opacity-70 mt-2">Your new limits are already active.</p>
              <Link to="/dashboard" className="btn-pill mt-6 inline-block bg-[#1B2340] text-[#EEF1F6]">Back to dashboard</Link>
            </>
          )}
          {(status === "failed" || status === "error" || status === "timeout") && (
            <>
              <XCircle size={48} className="mx-auto text-[#C1443B]" />
              <h1 className="font-display text-2xl font-bold mt-4 text-[#C1443B]">Something went wrong</h1>
              <p className="opacity-70 mt-2 text-sm">The payment could not be confirmed yet. If you were charged, refresh in a minute.</p>
              <Link to="/pricing" className="btn-pill mt-6 inline-block bg-[#1B2340] text-[#EEF1F6]">Back to pricing</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

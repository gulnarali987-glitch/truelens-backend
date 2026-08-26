import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Chrome } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, name);
      toast.success("Account created — you're in!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#EEF1F6] grain pt-24">
      <Header />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="glass rounded-3xl p-8">
          <div className="label-tiny opacity-60">Get started</div>
          <h1 className="font-display text-3xl font-bold text-[#1B2340] mt-1">Create your TrueLense account</h1>
          <p className="text-sm opacity-70 mt-1">5 checks per month on the free plan. Upgrade anytime.</p>
          <form onSubmit={submit} className="space-y-4 mt-6">
            <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-full h-12 px-5" data-testid="signup-name" />
            <Input type="email" placeholder="you@work.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full h-12 px-5" required data-testid="signup-email" />
            <Input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-full h-12 px-5" required minLength={6} data-testid="signup-password" />
            <button type="submit" disabled={loading} className="btn-pill bg-[#1B2340] text-[#EEF1F6] w-full disabled:opacity-60" data-testid="signup-submit">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs opacity-60">
            <div className="flex-1 h-px bg-black/10" /> OR <div className="flex-1 h-px bg-black/10" />
          </div>
          <button onClick={googleLogin} className="btn-pill bg-white hairline text-[#1B2340] w-full flex items-center justify-center gap-2" data-testid="google-signup">
            <Chrome size={16} /> Continue with Google
          </button>
          <div className="text-sm text-center mt-6 opacity-70">
            Already have an account? <Link to="/login" className="text-[#1B2340] font-semibold underline" data-testid="link-login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEMOS = [
  { role: "Administrator", email: "admin@nammakavacha.ai", pw: "Admin@123", tid: "demo-admin" },
  { role: "Crime Analyst", email: "analyst@nammakavacha.ai", pw: "Analyst@123", tid: "demo-analyst" },
  { role: "Supervisor", email: "supervisor@nammakavacha.ai", pw: "Supervisor@123", tid: "demo-supervisor" },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome to Namma Kavacha");
      nav("/app/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const applyDemo = (d) => { setEmail(d.email); setPassword(d.pw); };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute inset-0" style={{background:"radial-gradient(600px 400px at 50% 20%, rgba(0,229,255,0.08), transparent 70%)"}} />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8" data-testid="login-logo">
          <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center cyan-glow">
            <Shield className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div className="leading-tight text-left">
            <div className="font-bold tracking-tight">Namma Kavacha</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Command Center Access</div>
          </div>
        </Link>

        <form onSubmit={submit} className="glass p-8 space-y-5" data-testid="login-form">
          <div>
            <div className="label-eyebrow mb-2">Officer Email</div>
            <input className="input-dark" type="email" placeholder="you@ksp.gov.in"
              value={email} onChange={(e)=>setEmail(e.target.value)} required
              data-testid="login-email-input" autoComplete="email" />
          </div>
          <div>
            <div className="label-eyebrow mb-2">Password</div>
            <input className="input-dark" type="password" placeholder="••••••••"
              value={password} onChange={(e)=>setPassword(e.target.value)} required
              data-testid="login-password-input" autoComplete="current-password" />
          </div>
          <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={busy} type="submit" data-testid="login-submit">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Authenticating" : "Sign in securely"}
          </button>
        </form>

        <div className="mt-6 glass p-5">
          <div className="label-eyebrow mb-3">Demo Accounts — one click</div>
          <div className="space-y-2">
            {DEMOS.map((d) => (
              <button key={d.email} onClick={() => applyDemo(d)}
                className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-white/10 hover:border-[#00E5FF]/40 hover:bg-white/5 transition-colors"
                data-testid={d.tid}>
                <div>
                  <div className="text-sm font-medium">{d.role}</div>
                  <div className="text-xs text-slate-400">{d.email}</div>
                </div>
                <div className="text-xs text-[#00E5FF] font-mono">{d.pw}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-slate-400 hover:text-white">← Back to landing</Link>
        </div>
      </div>
    </div>
  );
}

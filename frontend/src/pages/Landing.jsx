import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import HeroNetwork from "@/components/HeroNetwork";
import CountUp from "react-countup";
import { Shield, Zap, Map as MapIcon, Network, Bot, FileSearch, TrendingUp, Users as UsersIcon, LineChart, ArrowRight, Command } from "lucide-react";
import { gsap } from "gsap";

const MODULES = [
  { icon: LineChart, title: "Executive Command Center", desc: "Live KPIs, priority alerts, district heat summary — one glance answers What/Why/Next." },
  { icon: FileSearch, title: "Case Workspace", desc: "Full FIR lifecycle — victims, accused, arrests, chargesheets, timelines, linked entities." },
  { icon: Bot, title: "Kavacha AI Copilot", desc: "Natural-language chat over the case corpus with cited, source-linked answers." },
  { icon: Network, title: "Criminal Network Analysis", desc: "Interactive 3D relationship graph — co-accused links, case clusters, path-finding." },
  { icon: MapIcon, title: "Map Intelligence", desc: "Geospatial heat layers, density clusters, predictive hotspots by district." },
  { icon: TrendingUp, title: "Prediction Engine", desc: "ML-driven hotspot & trend forecasting with confidence and explanation." },
];

const FEATURES = [
  "Instant full-text FIR search with AI ranking",
  "Similar case discovery by MO, location, entities",
  "Real-time district crime heat & 3D-tilt map",
  "AI-generated investigation reports (PDF/Excel export)",
  "Command palette (⌘K) — any case in one keystroke",
  "Excel & PDF ingestion with review-and-confirm",
  "Role-based access — Admin, Analyst, Supervisor",
  "Immutable audit trail on every action",
];

export default function Landing() {
  const heroRef = useRef();
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-headline", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out" });
      gsap.fromTo(".hero-sub", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.2, ease: "power3.out" });
      gsap.fromTo(".hero-ctas", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, delay: 0.4, ease: "power3.out" });
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 40 }, {
          opacity: 1, y: 0, duration: 0.9, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
        });
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="relative min-h-screen bg-[#040914] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#040914]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
            <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center cyan-glow">
              <Shield className="w-5 h-5 text-[#00E5FF]" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">Namma Kavacha</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Karnataka State Police</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#modules" className="text-slate-300 hover:text-white transition-colors">Modules</a>
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#stats" className="text-slate-300 hover:text-white transition-colors">Impact</a>
            <a href="#contact" className="text-slate-300 hover:text-white transition-colors">Contact</a>
          </div>
          <Link to="/login" className="btn-primary" data-testid="landing-login-cta">Officer Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0"><HeroNetwork /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#040914]/20 via-transparent to-[#040914]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6">
              <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
              <span className="label-eyebrow text-emerald-300">Live Intelligence Platform</span>
            </div>
            <h1 className="hero-headline text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.02] mb-6">
              Static records don't solve crimes.<br/>
              <span className="text-[#00E5FF]">Live intelligence does.</span>
            </h1>
            <p className="hero-sub text-lg lg:text-xl text-slate-300 max-w-2xl mb-8 leading-relaxed">
              Namma Kavacha turns FIRs, chargesheets and arrest records into a decision-grade command center — instant search,
              relationship graphs, predictive hotspots, and Kavacha AI that cites its evidence.
            </p>
            <div className="hero-ctas flex flex-wrap items-center gap-3">
              <Link to="/login" className="btn-primary inline-flex items-center gap-2" data-testid="hero-primary-cta">
                Launch Command Center <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#modules" className="btn-secondary inline-flex items-center gap-2">See modules</a>
              <div className="ml-2 hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <Command className="w-3.5 h-3.5" /> Press ⌘K anywhere to jump to any case
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 hidden lg:block">
            <div className="glass p-6 space-y-4">
              <div className="label-eyebrow">Kavacha AI · Live</div>
              <div className="text-sm text-slate-300 leading-relaxed">
                <span className="text-[#00E5FF]">›</span> Show hotspots in Bengaluru this month
              </div>
              <div className="text-xs text-slate-400 leading-relaxed border-l-2 border-[#00E5FF]/40 pl-3">
                Bengaluru City shows a <span className="text-white font-semibold">+28%</span> uptick in cyber-fraud cases
                over 30 days. Two clusters identified in Whitefield & HSR Layout. <span className="text-[#00E5FF]">[FIR/2025/BEN/1044]</span> shares
                accused with <span className="text-[#00E5FF]">[FIR/2025/BEN/1061]</span>.
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Confidence</span>
                <span className="text-emerald-400 font-mono">92%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="reveal max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="label-eyebrow text-[#00E5FF]">About Namma Kavacha</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-5">
              A command-center product — not another dashboard.
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Built for the Karnataka State Police, Namma Kavacha unifies every FIR, victim, accused,
              arrest and chargesheet into a single, live-updating intelligence workspace. Beat officers get instant answers;
              analysts get pattern discovery; commanders get one-glance situational awareness.
            </p>
          </div>
          <div className="glass p-8 space-y-4">
            {[
              ["What is happening", "Live KPIs, alerts, and heat across every district."],
              ["Why is it happening", "AI-linked patterns, MO clustering, network graphs."],
              ["What next", "Predictive hotspots, similar-case leads, action recommendations."],
            ].map(([q, a]) => (
              <div key={q} className="flex gap-4">
                <div className="w-1 rounded bg-[#00E5FF]" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">{q}</div>
                  <div className="text-white mt-1">{a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="reveal max-w-7xl mx-auto px-6 py-16">
        <div className="label-eyebrow text-[#00E5FF]">Platform Modules</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-10">Every workflow. One interaction language.</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((m) => (
            <div key={m.title} className="glass glass-hover p-6 transition-colors" data-testid={`module-card-${m.title.replace(/\s+/g,'-').toLowerCase()}`}>
              <m.icon className="w-6 h-6 text-[#00E5FF] mb-4" />
              <div className="font-semibold text-lg mb-1.5">{m.title}</div>
              <div className="text-sm text-slate-400 leading-relaxed">{m.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="reveal max-w-7xl mx-auto px-6 py-16">
        <div className="label-eyebrow text-[#00E5FF]">Features</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-10">Depth without friction.</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="glass p-4 flex gap-3 items-start">
              <Zap className="w-4 h-4 text-[#00E5FF] mt-0.5 shrink-0" />
              <div className="text-sm text-slate-200">{f}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="reveal max-w-7xl mx-auto px-6 py-24">
        <div className="glass p-10 lg:p-14">
          <div className="label-eyebrow text-[#00E5FF]">Crime Intelligence Impact</div>
          <div className="grid md:grid-cols-4 gap-8 mt-8">
            {[
              { label: "FIRs indexed", value: 128000, suffix: "+" },
              { label: "Districts covered", value: 31, suffix: "" },
              { label: "AI queries / day", value: 5400, suffix: "" },
              { label: "Faster case linkage", value: 87, suffix: "%" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                  <CountUp end={s.value} duration={2.5} separator="," />{s.suffix}
                </div>
                <div className="label-eyebrow mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="reveal max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="label-eyebrow text-[#00E5FF]">Karnataka Police Mission</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3 mb-5">Serve. Protect. Predict.</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              From Bengaluru's cyber-fraud rings to coastal narcotics traffic, Karnataka's officers face increasingly
              coordinated adversaries. Namma Kavacha equips them with the same operational tempo — data at the speed of decision.
            </p>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>› Reachable within three clicks — no menu spelunking.</li>
              <li>› Works on field devices with degraded connectivity.</li>
              <li>› Every action attributed. Every export auditable.</li>
            </ul>
          </div>
          <div className="glass p-8">
            <div className="label-eyebrow mb-2">Kavacha AI · Capabilities</div>
            <div className="space-y-3 text-sm text-slate-300">
              <div>› Ask any question about a case, entity, or pattern in plain English.</div>
              <div>› Cites specific FIRs, arrest dates, and forensic evidence in every answer.</div>
              <div>› Drafts investigation summaries, chargesheets, and briefing reports on demand.</div>
              <div>› Surfaces similar historical cases by MO, location, and accused overlap.</div>
              <div>› Explains predictions — "why this district, why this week."</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="reveal max-w-7xl mx-auto px-6 py-16">
        <div className="glass p-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="label-eyebrow text-[#00E5FF]">Get in touch</div>
            <div className="text-2xl font-bold mt-2">Deploy Namma Kavacha for your unit.</div>
            <div className="text-slate-400 mt-1 text-sm">Contact the Karnataka State Police Modernization Cell.</div>
          </div>
          <div className="flex gap-3">
            <a href="mailto:modernization@ksp.gov.in" className="btn-secondary">modernization@ksp.gov.in</a>
            <Link to="/login" className="btn-primary" data-testid="contact-cta">Access Platform</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        © 2026 Namma Kavacha · Karnataka State Police · Built for officers, by intelligence engineers.
      </footer>
    </div>
  );
}

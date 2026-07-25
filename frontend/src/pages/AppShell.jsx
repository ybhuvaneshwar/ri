import React, { useEffect, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLiveSocket } from "@/lib/socket";
import { flushQueue, getQueue } from "@/lib/offline";
import { Shield, LayoutDashboard, FileSearch, Bot, LineChart, Network, Map as MapIcon, TrendingUp, FileText, Users as UsersIcon, ScrollText, Upload, LogOut, Command as CmdIcon, Bell, Sparkles, WifiOff, Radio, MessageSquare, Sun, Moon } from "lucide-react";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, CommandDialog } from "@/components/ui/command";
import { api } from "@/lib/api";
import AiSidePanel from "@/components/AiSidePanel";
import { toast } from "sonner";

const NAV_META = [
  { to: "dashboard", tKey: "nav.dashboard", icon: LayoutDashboard, roles: ["admin","analyst","supervisor"] },
  { to: "cases", tKey: "nav.cases", icon: FileSearch, roles: ["admin","analyst","supervisor"] },
  { to: "kavacha", tKey: "nav.kavacha", icon: Bot, roles: ["admin","analyst"] },
  { to: "analytics", tKey: "nav.analytics", icon: LineChart, roles: ["admin","analyst","supervisor"] },
  { to: "network", tKey: "nav.network", icon: Network, roles: ["admin","analyst","supervisor"] },
  { to: "map", tKey: "nav.map", icon: MapIcon, roles: ["admin","analyst","supervisor"] },
  { to: "predictions", tKey: "nav.predictions", icon: TrendingUp, roles: ["admin","analyst","supervisor"] },
  { to: "reports", tKey: "nav.reports", icon: FileText, roles: ["admin","analyst","supervisor"] },
  { to: "uploads", tKey: "nav.uploads", icon: Upload, roles: ["admin","analyst"] },
  { to: "users", tKey: "nav.users", icon: UsersIcon, roles: ["admin"] },
  { to: "audit", tKey: "nav.audit", icon: ScrollText, roles: ["admin","supervisor"] },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const nav = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);

  const { connected, online } = useLiveSocket((evt) => {
    setLiveEvents(e => [evt, ...e].slice(0, 20));
    if (evt.type === "case:created") {
      toast.success(`New case: ${evt.payload.fir_no} — ${evt.payload.title}`, { description: `${evt.payload.district} · by ${evt.payload.by}` });
    } else if (evt.type === "alert:dispatched") {
      toast.info(`Alert sent — ${evt.payload.channels.join(", ")} to ${evt.payload.recipients_count} recipient(s)`);
    } else if (evt.type === "case:deleted") {
      toast.warning(`Case deleted (${evt.payload.id.slice(0,8)}) by ${evt.payload.by}`);
    }
  });

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen(true); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setAiOpen(v => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (cmdOpen && cases.length === 0) api.get("/cases?limit=200").then(({data}) => setCases(data)).catch(()=>{});
  }, [cmdOpen, cases.length]);

  useEffect(() => { api.get("/notifications").then(({data}) => setNotifs(data)).catch(()=>{}); }, []);

  useEffect(() => {
    if (online) {
      const q = getQueue();
      if (q.length) flushQueue().then(r => { if (r.flushed) toast.success(`Synced ${r.flushed} queued write(s)`); });
    }
  }, [online]);

  const allowed = NAV_META.filter(n => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex text-white">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#040914]/90 backdrop-blur-xl min-h-screen sticky top-0 flex flex-col">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10" data-testid="app-logo">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight">Namma Kavacha</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t("app.tagline")}</div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {allowed.map(item => (
            <NavLink key={item.to} to={item.to} data-testid={`nav-${item.to}`}
              className={({isActive}) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30"
                           : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }>
              <item.icon className="w-4 h-4" /> {t(item.tKey)}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button onClick={() => setCmdOpen(true)}
            className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#00E5FF]/40 transition-colors"
            data-testid="cmd-k-trigger">
            <span className="flex items-center gap-2 text-slate-400"><CmdIcon className="w-3.5 h-3.5" /> {t("common.quickJump")}</span>
            <span className="font-mono text-[10px] text-slate-500">⌘K</span>
          </button>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1">
              <button onClick={() => setLang("en")} className={`text-[10px] px-2 py-1 rounded-md ${lang==="en"?"bg-[#00E5FF] text-[#040914] font-semibold":"text-slate-400 hover:text-white"}`} data-testid="lang-en">EN</button>
              <button onClick={() => setLang("kn")} className={`text-[10px] px-2 py-1 rounded-md ${lang==="kn"?"bg-[#00E5FF] text-[#040914] font-semibold":"text-slate-400 hover:text-white"}`} data-testid="lang-kn">ಕನ್ನಡ</button>
            </div>
            <button onClick={toggleTheme} className="text-[10px] px-2 py-1 rounded-md text-slate-400 hover:text-white border border-white/10 flex items-center gap-1" data-testid="theme-toggle" title={`Switch to ${theme==='dark'?'light':'dark'} mode`}>
              {theme === "dark" ? <Sun className="w-3 h-3"/> : <Moon className="w-3 h-3"/>}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>

          <div className="glass p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-sm font-bold">{user?.name?.[0] || "U"}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">{user?.role}</div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-red-400" title={t("common.logout")} data-testid="logout-btn"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {!online && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 text-xs text-amber-300 flex items-center gap-2" data-testid="offline-banner">
            <WifiOff className="w-3.5 h-3.5" /> {t("common.offline")}
          </div>
        )}
        <header className="sticky top-0 z-20 bg-[#040914]/70 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 pulse-glow" : "bg-slate-500"}`} />
            <div className="text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Radio className="w-3 h-3" /> {connected ? t("common.live") : "Reconnecting…"} · {user?.district || "Karnataka"}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setAiOpen(true)} className="btn-primary text-xs inline-flex items-center gap-1.5" data-testid="ai-panel-trigger" title="Ask Kavacha AI (⌘J)">
              <Sparkles className="w-3.5 h-3.5" /> {t("common.askKavacha")} <span className="font-mono text-[10px] opacity-70 ml-1">⌘J</span>
            </button>
            <button onClick={() => setNotifOpen(v => !v)} className="relative p-2 rounded-lg border border-white/10 hover:border-[#00E5FF]/40 transition-colors" data-testid="notif-btn">
              <Bell className="w-4 h-4 text-slate-300" />
              {notifs.length > 0 && <span className="absolute -top-1 -right-1 text-[9px] bg-[#EF4444] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{notifs.length}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-96 glass p-3 z-50 max-h-[70vh] overflow-y-auto" data-testid="notif-panel">
                <div className="label-eyebrow mb-2 px-1">Alerts</div>
                <div className="space-y-2">
                  {notifs.map(n => (
                    <div key={n.id} className={`p-3 rounded-lg border ${n.severity==='crimson'?'border-red-500/30 bg-red-500/5':n.severity==='amber'?'border-amber-500/30 bg-amber-500/5':'border-emerald-500/30 bg-emerald-500/5'}`}>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{n.body}</div>
                    </div>
                  ))}
                  {liveEvents.length > 0 && <div className="pt-2 mt-2 border-t border-white/5 label-eyebrow">Live events</div>}
                  {liveEvents.slice(0,5).map((e, i) => (
                    <div key={i} className="text-xs p-2 rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/5">
                      <span className="text-[#00E5FF] font-mono">{e.type}</span> · <span className="text-slate-400">{new Date(e.ts).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-6"><Outlet /></div>
      </main>

      <AiSidePanel open={aiOpen} onOpenChange={setAiOpen} />

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search cases, jump to modules… (FIR, accused, district)" data-testid="cmd-input" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Modules">
            {allowed.map(m => (
              <CommandItem key={m.to} onSelect={() => { nav(`/app/${m.to}`); setCmdOpen(false); }}>
                <m.icon className="w-4 h-4 mr-2" /> {t(m.tKey)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Cases">
            {cases.slice(0,30).map(c => (
              <CommandItem key={c.id} onSelect={() => { nav(`/app/cases/${c.id}`); setCmdOpen(false); }}>
                <FileSearch className="w-4 h-4 mr-2" />
                <span className="font-mono text-xs mr-2 text-[#00E5FF]">{c.fir_no}</span>
                <span className="text-slate-300">{c.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

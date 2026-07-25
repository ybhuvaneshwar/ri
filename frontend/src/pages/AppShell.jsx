import React, { useEffect, useState } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Shield, LayoutDashboard, FileSearch, Bot, LineChart, Network, Map as MapIcon, TrendingUp, FileText, Users as UsersIcon, ScrollText, Upload, LogOut, Command as CmdIcon, Bell } from "lucide-react";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, CommandDialog } from "@/components/ui/command";
import { api } from "@/lib/api";

const NAV = [
  { to: "dashboard", label: "Command Center", icon: LayoutDashboard, roles: ["admin","analyst","supervisor"] },
  { to: "cases", label: "Cases & FIRs", icon: FileSearch, roles: ["admin","analyst","supervisor"] },
  { to: "kavacha", label: "Kavacha AI", icon: Bot, roles: ["admin","analyst"] },
  { to: "analytics", label: "Analytics", icon: LineChart, roles: ["admin","analyst","supervisor"] },
  { to: "network", label: "Criminal Network", icon: Network, roles: ["admin","analyst","supervisor"] },
  { to: "map", label: "Map Intelligence", icon: MapIcon, roles: ["admin","analyst","supervisor"] },
  { to: "predictions", label: "Predictions", icon: TrendingUp, roles: ["admin","analyst","supervisor"] },
  { to: "reports", label: "Reports", icon: FileText, roles: ["admin","analyst","supervisor"] },
  { to: "uploads", label: "Data Ingestion", icon: Upload, roles: ["admin","analyst"] },
  { to: "users", label: "Users & Roles", icon: UsersIcon, roles: ["admin"] },
  { to: "audit", label: "Audit Log", icon: ScrollText, roles: ["admin","supervisor"] },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (cmdOpen && cases.length === 0) {
      api.get("/cases?limit=200").then(({data}) => setCases(data)).catch(()=>{});
    }
  }, [cmdOpen, cases.length]);

  useEffect(() => {
    api.get("/notifications").then(({data}) => setNotifs(data)).catch(()=>{});
  }, []);

  const allowed = NAV.filter(n => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex text-white">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#040914]/90 backdrop-blur-xl min-h-screen sticky top-0 flex flex-col">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10" data-testid="app-logo">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight">Namma Kavacha</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Command Center</div>
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
              <item.icon className="w-4 h-4" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button onClick={() => setCmdOpen(true)}
            className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#00E5FF]/40 transition-colors"
            data-testid="cmd-k-trigger">
            <span className="flex items-center gap-2 text-slate-400"><CmdIcon className="w-3.5 h-3.5" /> Quick jump</span>
            <span className="font-mono text-[10px] text-slate-500">⌘K</span>
          </button>
          <div className="glass p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center text-sm font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate" data-testid="user-name">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">{user?.role}</div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-crimson-400 hover:text-red-400" title="Logout" data-testid="logout-btn">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#040914]/70 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
            <div className="text-xs uppercase tracking-widest text-slate-400">Live · {user?.district || "Karnataka"}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setNotifOpen(v => !v)} className="relative p-2 rounded-lg border border-white/10 hover:border-[#00E5FF]/40 transition-colors" data-testid="notif-btn">
              <Bell className="w-4 h-4 text-slate-300" />
              {notifs.length > 0 && <span className="absolute -top-1 -right-1 text-[9px] bg-[#EF4444] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{notifs.length}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-6 top-14 w-96 glass p-3 z-50 max-h-[70vh] overflow-y-auto" data-testid="notif-panel">
                <div className="label-eyebrow mb-2 px-1">Alerts</div>
                <div className="space-y-2">
                  {notifs.map(n => (
                    <div key={n.id} className={`p-3 rounded-lg border ${n.severity==='crimson'?'border-red-500/30 bg-red-500/5':n.severity==='amber'?'border-amber-500/30 bg-amber-500/5':'border-emerald-500/30 bg-emerald-500/5'}`}>
                      <div className="text-sm font-semibold">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{n.body}</div>
                    </div>
                  ))}
                  {notifs.length === 0 && <div className="text-xs text-slate-500 p-2">No alerts.</div>}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-6"><Outlet /></div>
      </main>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search cases, jump to modules… (FIR number, accused name, district)" data-testid="cmd-input" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Modules">
            {allowed.map(m => (
              <CommandItem key={m.to} onSelect={() => { nav(`/app/${m.to}`); setCmdOpen(false); }}>
                <m.icon className="w-4 h-4 mr-2" /> {m.label}
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

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import CountUp from "react-countup";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp, TrendingDown, ShieldCheck, FileCheck2, FolderOpen, Flame, ArrowRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";

const KPI = [
  { key: "total", label: "Total FIRs", icon: FolderOpen, color: "#00E5FF" },
  { key: "open", label: "Active investigations", icon: ShieldCheck, color: "#F59E0B" },
  { key: "critical", label: "Critical severity", icon: Flame, color: "#EF4444" },
  { key: "chargesheeted", label: "Chargesheeted", icon: FileCheck2, color: "#10B981" },
];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cats, setCats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    api.get("/dashboard/kpis").then(({data}) => setKpis(data));
    api.get("/analytics/timeline?days=120").then(({data}) => setTimeline(data));
    api.get("/analytics/by-district").then(({data}) => setDistricts(data.slice(0, 10)));
    api.get("/analytics/by-category").then(({data}) => setCats(data));
    api.get("/notifications").then(({data}) => setAlerts(data));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Executive Command Center</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Situational awareness — Karnataka</h1>
        </div>
        <div className="text-xs text-slate-400 text-right">
          <div>Updated live · <span className="text-[#00E5FF] font-mono text-sm" data-testid="live-clock">{now.toLocaleTimeString()}</span></div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{now.toLocaleDateString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"})}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map(k => (
          <div key={k.key} className="glass glass-hover p-5" data-testid={`kpi-${k.key}`}>
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">{k.label}</div>
              <k.icon className="w-4 h-4" style={{color: k.color}} />
            </div>
            <div className="text-4xl font-black tracking-tight mt-3" style={{color: k.color}}>
              {kpis ? <CountUp end={kpis[k.key] || 0} duration={1.6} /> : "—"}
            </div>
            {k.key === "total" && kpis && (
              <div className={`text-xs mt-1 flex items-center gap-1 ${kpis.trend_pct >= 0 ? "text-amber-400" : "text-emerald-400"}`}>
                {kpis.trend_pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpis.trend_pct >= 0 ? "+" : ""}{kpis.trend_pct}% vs prev 30d
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="glass p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow">Weekly case volume · 120 days</div>
              <div className="text-lg font-semibold">Crime trend</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)", borderRadius:8, color:"#fff"}} itemStyle={{color:"#fff"}} labelStyle={{color:"#00E5FF", fontWeight:600}} />
                <Line type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2.5} dot={{r:3, fill:"#00E5FF"}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Priority alerts</div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map(a => (
              <div key={a.id} className={`p-3 rounded-lg border flex items-start gap-2 ${a.severity==='crimson'?'border-red-500/30 bg-red-500/5':a.severity==='amber'?'border-amber-500/30 bg-amber-500/5':'border-emerald-500/30 bg-emerald-500/5'}`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${a.severity==='crimson'?'text-red-400':a.severity==='amber'?'text-amber-400':'text-emerald-400'}`} />
                <div>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Districts */}
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Cases by district</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={districts} layout="vertical" margin={{left:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis type="category" dataKey="district" stroke="#94A3B8" fontSize={11} width={120} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)", borderRadius:8, color:"#fff"}} itemStyle={{color:"#fff"}} labelStyle={{color:"#00E5FF", fontWeight:600}} />
                <Bar dataKey="total" fill="#00E5FF" radius={[0,4,4,0]} />
                <Bar dataKey="critical" fill="#EF4444" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories */}
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Crime categories</div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {cats.map(c => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="text-sm text-slate-300 w-40 shrink-0">{c.category}</div>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00E5FF] rounded-full" style={{width: `${Math.min(100, c.count * 3)}%`}} />
                </div>
                <div className="text-sm font-mono text-[#00E5FF] w-10 text-right">{c.count}</div>
              </div>
            ))}
          </div>
          <Link to="/app/analytics" className="mt-4 inline-flex text-xs text-[#00E5FF] items-center gap-1 hover:underline">
            Deep analytics <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#00E5FF","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16"];

export default function Analytics() {
  const [districts, setDistricts] = useState([]);
  const [cats, setCats] = useState([]);
  const [timeline, setTimeline] = useState([]);
  useEffect(() => {
    api.get("/analytics/by-district").then(({data}) => setDistricts(data));
    api.get("/analytics/by-category").then(({data}) => setCats(data));
    api.get("/analytics/timeline?days=180").then(({data}) => setTimeline(data));
  }, []);

  return (
    <div className="space-y-5" data-testid="analytics-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Analytics</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Trends & distributions</h1>
      </div>

      <div className="glass p-5">
        <div className="label-eyebrow mb-3">6-month case volume</div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
              <Line type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2.5} dot={{r:3}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">District breakdown</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={districts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="district" stroke="#94A3B8" fontSize={10} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Bar dataKey="total" fill="#00E5FF" radius={[4,4,0,0]} />
                <Bar dataKey="critical" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Category composition</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cats} dataKey="count" nameKey="category" outerRadius={100} innerRadius={55}>
                  {cats.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {cats.map((c,i) => (
              <div key={c.category} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{background: COLORS[i % COLORS.length]}} />
                <span className="text-slate-300 truncate">{c.category}</span>
                <span className="text-slate-500 font-mono ml-auto">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

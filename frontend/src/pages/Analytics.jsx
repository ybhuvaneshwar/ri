import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, Legend } from "recharts";

const COLORS = ["#00E5FF","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#84CC16","#F97316","#3B82F6"];
const SEV_COLOR = { Critical: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#94A3B8" };

export default function Analytics() {
  const [districts, setDistricts] = useState([]);
  const [cats, setCats] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [severities, setSeverities] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [topStations, setTopStations] = useState([]);
  const [topAccused, setTopAccused] = useState([]);
  const [gender, setGender] = useState({ victims: [], accused: [] });

  useEffect(() => {
    api.get("/analytics/by-district").then(({data}) => setDistricts(data.slice(0, 20)));
    api.get("/analytics/by-category").then(({data}) => setCats(data));
    api.get("/analytics/timeline?days=180").then(({data}) => setTimeline(data));
    api.get("/analytics/by-status").then(({data}) => setStatuses(data));
    api.get("/analytics/by-severity").then(({data}) => setSeverities(data));
    api.get("/analytics/monthly-trend?months=12").then(({data}) => setMonthly(data));
    api.get("/analytics/top-stations").then(({data}) => setTopStations(data));
    api.get("/analytics/top-accused").then(({data}) => setTopAccused(data));
    api.get("/analytics/gender-breakdown").then(({data}) => setGender(data));
  }, []);

  return (
    <div className="space-y-5" data-testid="analytics-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Analytics</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Trends & distributions</h1>
      </div>

      {/* Row 1: Timeline */}
      <div className="glass p-5">
        <div className="label-eyebrow mb-3">Weekly case volume · 180 days</div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#00E5FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
              <Area type="monotone" dataKey="count" stroke="#00E5FF" strokeWidth={2} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: monthly + severity */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass p-5 lg:col-span-2">
          <div className="label-eyebrow mb-3">Monthly trend by severity · 12 months</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Legend wrapperStyle={{fontSize:11}} />
                <Bar dataKey="critical" stackId="a" fill="#EF4444" name="Critical" />
                <Bar dataKey="high" stackId="a" fill="#F97316" name="High" />
                <Bar dataKey="total" fill="#00E5FF" name="Total" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Severity distribution</div>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={severities} dataKey="count" nameKey="severity" outerRadius={80} innerRadius={45}>
                  {severities.map((s,i) => <Cell key={i} fill={SEV_COLOR[s.severity] || COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Legend wrapperStyle={{fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: status + top-stations */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Case status distribution</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={statuses}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="status" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Bar dataKey="count" fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Top 10 police stations by volume</div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={topStations} layout="vertical" margin={{left: 30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis type="category" dataKey="station" stroke="#94A3B8" fontSize={10} width={100} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Bar dataKey="count" fill="#00E5FF" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: categories + top-accused */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Crime categories</div>
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
          <div className="grid grid-cols-2 gap-1 mt-1">
            {cats.map((c,i) => (
              <div key={c.category} className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{background: COLORS[i % COLORS.length]}} />
                <span className="text-slate-300 truncate">{c.category}</span>
                <span className="text-slate-500 font-mono ml-auto">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Repeat offenders (top 15 accused)</div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {topAccused.map((a,i) => (
              <div key={a.name} className="flex items-center gap-3">
                <div className="w-5 text-xs text-slate-500 font-mono">{i+1}</div>
                <div className="text-sm text-slate-200 flex-1 truncate">{a.name}</div>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden max-w-40">
                  <div className="h-full bg-[#EF4444]" style={{width: `${Math.min(100, a.count * 8)}%`}} />
                </div>
                <div className="text-sm font-mono text-[#EF4444] w-8 text-right">{a.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: districts + gender */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Top 20 districts / stations</div>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={districts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="district" stroke="#94A3B8" fontSize={9} interval={0} angle={-45} textAnchor="end" height={90} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                <Bar dataKey="total" fill="#00E5FF" radius={[4,4,0,0]} />
                <Bar dataKey="critical" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">Gender breakdown</div>
          <div className="grid grid-cols-2 h-72">
            <div>
              <div className="text-xs text-slate-400 text-center mb-1">Victims</div>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={gender.victims} dataKey="count" nameKey="gender" outerRadius={70}>
                    {gender.victims.map((_,i) => <Cell key={i} fill={i===0?"#00E5FF":i===1?"#EC4899":"#94A3B8"} />)}
                  </Pie>
                  <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                  <Legend wrapperStyle={{fontSize:10}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-xs text-slate-400 text-center mb-1">Accused</div>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={gender.accused} dataKey="count" nameKey="gender" outerRadius={70}>
                    {gender.accused.map((_,i) => <Cell key={i} fill={i===0?"#F97316":i===1?"#8B5CF6":"#94A3B8"} />)}
                  </Pie>
                  <Tooltip contentStyle={{background:"#0B132B", border:"1px solid rgba(0,229,255,0.3)"}} />
                  <Legend wrapperStyle={{fontSize:10}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

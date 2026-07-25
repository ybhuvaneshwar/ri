import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const RISK_STYLE = {
  High: { badge: "bg-red-500/15 text-red-400 border-red-500/30", bar: "bg-red-500" },
  Medium: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", bar: "bg-amber-500" },
  Low: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", bar: "bg-emerald-500" },
};

export default function Predictions() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/predictions/hotspots").then(({data}) => setItems(data)); }, []);

  return (
    <div className="space-y-5" data-testid="predictions-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Prediction Engine</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Hotspot forecast · next 30 days</h1>
        <p className="text-sm text-slate-400 mt-1">Confidence-scored predictions with explanations. Ranked by likelihood.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map(p => (
          <div key={p.district} className="glass p-5 space-y-3" data-testid={`prediction-${p.district}`}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{p.district}</div>
              <span className={`text-xs px-2 py-1 rounded-full border ${RISK_STYLE[p.risk].badge}`}>{p.risk} risk</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black text-white">{p.confidence}%</div>
              <div className="label-eyebrow">confidence</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Recent 30d vs baseline</span>
                <span className={p.growth_pct >= 0 ? "text-amber-400" : "text-emerald-400"}>
                  {p.growth_pct >= 0 ? <TrendingUp className="w-3 h-3 inline"/> : <TrendingDown className="w-3 h-3 inline"/>} {p.growth_pct}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${RISK_STYLE[p.risk].bar}`} style={{width: `${p.confidence}%`}} />
              </div>
              <div className="mt-1 text-xs text-slate-500">Cases: <span className="text-white font-mono">{p.recent_30d}</span> · baseline avg <span className="text-white font-mono">{p.baseline_30d}</span></div>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed border-l-2 border-[#00E5FF]/40 pl-3">
              <span className="label-eyebrow mr-1">Why:</span> {p.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

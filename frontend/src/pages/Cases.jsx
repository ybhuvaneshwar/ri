import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { Search, Filter } from "lucide-react";

export default function Cases() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [statusF, setStatusF] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (district) params.set("district", district);
    if (statusF) params.set("status", statusF);
    api.get(`/cases?${params.toString()}`).then(({data}) => setItems(data)).finally(()=>setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line

  const districts = useMemo(() => Array.from(new Set(items.map(i => i.district))), [items]);

  return (
    <div className="space-y-5" data-testid="cases-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Case Workspace</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Cases & FIRs</h1>
        </div>
        <div className="text-xs text-slate-400"><span className="font-mono text-[#00E5FF]">{items.length}</span> cases loaded</div>
      </div>

      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Search FIR #, accused, victim, location…"
            value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&load()}
            data-testid="cases-search-input" />
        </div>
        <select className="input-dark max-w-48" value={district} onChange={(e)=>{setDistrict(e.target.value); setTimeout(load,10);}} data-testid="cases-filter-district">
          <option value="">All districts</option>
          {["Bengaluru City","Mysuru","Mangaluru","Hubballi-Dharwad","Belagavi","Kalaburagi","Tumakuru","Shivamogga"].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-dark max-w-48" value={statusF} onChange={(e)=>{setStatusF(e.target.value); setTimeout(load,10);}} data-testid="cases-filter-status">
          <option value="">All statuses</option>
          {["Open","Under Investigation","Chargesheeted","Closed"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={load} data-testid="cases-apply-filters"><Filter className="w-4 h-4 inline mr-1" />Search</button>
      </div>

      <div className="glass p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="p-3 label-eyebrow">FIR</th>
                <th className="p-3 label-eyebrow">Title</th>
                <th className="p-3 label-eyebrow">District</th>
                <th className="p-3 label-eyebrow">Category</th>
                <th className="p-3 label-eyebrow">Status</th>
                <th className="p-3 label-eyebrow">Severity</th>
                <th className="p-3 label-eyebrow">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Loading…</td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No cases match.</td></tr>}
              {items.map(c => (
                <tr key={c.id} className="dense-row border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-3 font-mono text-[#00E5FF]">
                    <Link to={`/app/cases/${c.id}`} className="hover:underline" data-testid={`case-link-${c.fir_no}`}>{c.fir_no}</Link>
                  </td>
                  <td className="p-3 text-slate-200">{c.title}</td>
                  <td className="p-3 text-slate-300">{c.district}</td>
                  <td className="p-3 text-slate-400 text-xs">{c.crime_head} / {c.crime_sub_head}</td>
                  <td className="p-3"><span className={`status-${c.status.replace(/\s/g,'\\ ')} text-xs font-semibold`}>{c.status}</span></td>
                  <td className="p-3"><span className={`sev-${c.severity} text-xs px-2 py-0.5 rounded-full border`}>{c.severity}</span></td>
                  <td className="p-3 text-slate-400 text-xs">{c.date_registered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

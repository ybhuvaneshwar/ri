import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ScrollText } from "lucide-react";

const ACTION_COLOR = {
  login: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  create: "text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/20",
  update: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  delete: "text-red-400 bg-red-500/10 border-red-500/20",
  chat: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  upload: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  generate_report: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

export default function Audit() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/audit").then(({data}) => setLogs(data)); }, []);
  return (
    <div className="space-y-5" data-testid="audit-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Audit & Compliance</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Immutable activity log</h1>
      </div>
      <div className="glass p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-left label-eyebrow">Time</th>
              <th className="p-3 text-left label-eyebrow">User</th>
              <th className="p-3 text-left label-eyebrow">Action</th>
              <th className="p-3 text-left label-eyebrow">Resource</th>
              <th className="p-3 text-left label-eyebrow">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="dense-row border-b border-white/5 hover:bg-white/5" data-testid={`audit-row-${l.id}`}>
                <td className="p-3 text-xs text-slate-400 font-mono">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="p-3">
                  <div className="text-sm">{l.user_email}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">{l.user_role}</div>
                </td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${ACTION_COLOR[l.action] || "border-white/10 text-slate-300"}`}>{l.action}</span></td>
                <td className="p-3 text-slate-300 text-xs">{l.resource}{l.resource_id && <span className="text-slate-500"> · {l.resource_id.slice(0,8)}</span>}</td>
                <td className="p-3 text-slate-400 text-xs truncate max-w-lg">{l.details}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

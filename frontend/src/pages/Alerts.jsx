import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MessageSquare, Mail, Phone, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function Alerts() {
  const { user } = useAuth();
  const [channels, setChannels] = useState(["sms","email"]);
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);

  const load = () => api.get("/alerts").then(({data}) => setHistory(data)).catch(()=>{});
  useEffect(() => { load(); }, []);

  const toggleChannel = (c) => setChannels(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c]);

  const canSend = user?.role !== "supervisor";

  const send = async () => {
    if (!canSend) return;
    const list = recipients.split(",").map(r => r.trim()).filter(Boolean);
    if (!list.length || !body || !channels.length) return toast.error("Fill channels, recipients and body");
    setBusy(true);
    try {
      await api.post("/alerts/send", { channels, recipients: list, subject, body });
      toast.success("Alert dispatched (MOCK transport)");
      setRecipients(""); setSubject(""); setBody("");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5" data-testid="alerts-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Alerts Dispatch</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">SMS / Email broadcast</h1>
        <p className="text-sm text-slate-400 mt-1">
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">MOCKED</span>
          {" "}Transport is stubbed — wire Twilio / SendGrid / Emergent transports in <code className="text-[#00E5FF]">/api/alerts/send</code> to go live.
        </p>
      </div>

      {canSend && (
        <div className="glass p-5 space-y-4">
          <div>
            <div className="label-eyebrow mb-2">Channels</div>
            <div className="flex gap-2">
              <button onClick={()=>toggleChannel("sms")} className={channels.includes("sms")?"btn-primary":"btn-secondary"} data-testid="channel-sms"><Phone className="w-3.5 h-3.5 inline mr-1"/> SMS</button>
              <button onClick={()=>toggleChannel("email")} className={channels.includes("email")?"btn-primary":"btn-secondary"} data-testid="channel-email"><Mail className="w-3.5 h-3.5 inline mr-1"/> Email</button>
            </div>
          </div>
          <div>
            <div className="label-eyebrow mb-2">Recipients (comma-separated)</div>
            <input className="input-dark" placeholder="+91-9876543210, io@ksp.gov.in" value={recipients} onChange={e=>setRecipients(e.target.value)} data-testid="alert-recipients"/>
          </div>
          <div>
            <div className="label-eyebrow mb-2">Subject (email)</div>
            <input className="input-dark" placeholder="Hotspot advisory — HSR Layout" value={subject} onChange={e=>setSubject(e.target.value)} data-testid="alert-subject"/>
          </div>
          <div>
            <div className="label-eyebrow mb-2">Message</div>
            <textarea className="input-dark min-h-32" placeholder="Body of the SMS/email…" value={body} onChange={e=>setBody(e.target.value)} data-testid="alert-body"/>
          </div>
          <button className="btn-primary inline-flex items-center gap-2" onClick={send} disabled={busy} data-testid="alert-send-btn">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>} Dispatch
          </button>
        </div>
      )}

      <div className="glass p-5">
        <div className="label-eyebrow mb-3">Dispatch history</div>
        <div className="space-y-2">
          {history.map(a => (
            <div key={a.id} className="p-3 rounded-lg border border-white/10 bg-white/5" data-testid={`alert-row-${a.id}`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {a.channels.includes("sms") && <span className="text-[#00E5FF] flex items-center gap-1"><MessageSquare className="w-3 h-3"/> SMS</span>}
                  {a.channels.includes("email") && <span className="text-emerald-400 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</span>}
                  <span className="text-slate-500">→ {a.recipients.length} recipient(s)</span>
                </div>
                <div className="text-slate-400 font-mono">{new Date(a.sent_at).toLocaleString()}</div>
              </div>
              {a.subject && <div className="text-sm mt-1 font-medium">{a.subject}</div>}
              <div className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{a.body}</div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400"/> Delivered via {a.transport} · sent by {a.sent_by}
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="text-xs text-slate-500">No dispatches yet.</div>}
        </div>
      </div>
    </div>
  );
}

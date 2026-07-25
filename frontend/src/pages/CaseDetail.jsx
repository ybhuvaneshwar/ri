import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, MapPin, User, Users as UsersIcon, FileText, Sparkles, Loader2, Pencil, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const EDITABLE_FIELDS = ["title","crime_head","crime_sub_head","district","unit","status","severity","date_registered","location","description","io_officer","court"];

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [draft, setDraft] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [report, setReport] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "analyst";
  const canDelete = user?.role === "admin";

  const load = () => {
    api.get(`/cases/${id}`).then(({data}) => setC(data));
    api.get(`/cases/${id}/similar`).then(({data}) => setSimilar(data));
  };
  useEffect(load, [id]);

  const startEdit = () => {
    const d = {};
    EDITABLE_FIELDS.forEach(f => { d[f] = c[f] || ""; });
    setDraft(d);
    setEditMode(true);
  };
  const cancelEdit = () => { setDraft(null); setEditMode(false); };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/cases/${id}`, draft);
      setC(data);
      setEditMode(false); setDraft(null);
      toast.success("Case updated · propagated live");
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    try {
      await api.delete(`/cases/${id}`);
      toast.success("Case deleted");
      nav("/app/cases");
    } catch (e) { toast.error(e.response?.data?.detail || "Delete failed"); }
  };

  const generate = async () => {
    setReportBusy(true);
    try {
      const { data } = await api.post(`/kavacha/report/${id}`);
      setReport(data.report);
      toast.success("Kavacha AI report generated");
    } catch { toast.error("Report failed"); }
    finally { setReportBusy(false); }
  };

  if (!c) return <div className="text-slate-500">Loading case…</div>;

  const field = (label, key, type="text", options=null) => {
    if (!editMode) return null;
    return (
      <div>
        <div className="label-eyebrow mb-1">{label}</div>
        {options ? (
          <select className="input-dark" value={draft[key] || ""} onChange={e=>setDraft({...draft, [key]: e.target.value})} data-testid={`edit-${key}`}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === "textarea" ? (
          <textarea className="input-dark min-h-24" value={draft[key] || ""} onChange={e=>setDraft({...draft, [key]: e.target.value})} data-testid={`edit-${key}`}/>
        ) : (
          <input className="input-dark" type={type} value={draft[key] || ""} onChange={e=>setDraft({...draft, [key]: e.target.value})} data-testid={`edit-${key}`}/>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="case-detail-page">
      <Link to="/app/cases" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="w-3 h-3" /> All cases</Link>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-0">
          <div className="label-eyebrow text-[#00E5FF]">{c.crime_head} · {c.crime_sub_head}</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1" data-testid="case-title">{c.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-400 flex-wrap">
            <span className="font-mono text-[#00E5FF]">{c.fir_no}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.location}</span>
            <span>{c.date_registered}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className={`sev-${c.severity} text-xs px-3 py-1 rounded-full border`}>{c.severity}</span>
          <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">{c.status}</span>
          {!editMode && canEdit && (
            <button className="btn-secondary inline-flex items-center gap-2" onClick={startEdit} data-testid="edit-case-btn">
              <Pencil className="w-4 h-4"/> Edit
            </button>
          )}
          {!editMode && canDelete && (
            <button className="btn-secondary text-red-400 border-red-500/30 inline-flex items-center gap-2" onClick={remove} data-testid="delete-case-btn">
              <Trash2 className="w-4 h-4"/> Delete
            </button>
          )}
          {editMode && (
            <>
              <button className="btn-primary inline-flex items-center gap-2" onClick={saveEdit} disabled={saving} data-testid="save-case-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Save changes
              </button>
              <button className="btn-secondary inline-flex items-center gap-2" onClick={cancelEdit} data-testid="cancel-edit-btn">
                <X className="w-4 h-4"/> Cancel
              </button>
            </>
          )}
          {!editMode && (
            <button className="btn-primary inline-flex items-center gap-2" onClick={generate} disabled={reportBusy} data-testid="generate-report-btn">
              {reportBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate AI Report
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        <div className="glass p-5 space-y-4" data-testid="edit-form">
          <div className="label-eyebrow">Editing case</div>
          <div className="grid md:grid-cols-2 gap-4">
            {field("Title","title")}
            {field("Location","location")}
            {field("Crime head","crime_head")}
            {field("Crime sub-head","crime_sub_head")}
            {field("District","district")}
            {field("Unit","unit")}
            {field("Status","status","text",["Open","Under Investigation","Chargesheeted","Closed"])}
            {field("Severity","severity","text",["Low","Medium","High","Critical"])}
            {field("Date registered","date_registered","date")}
            {field("IO officer","io_officer")}
            {field("Court","court")}
          </div>
          {field("Description","description","textarea")}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="glass p-5 lg:col-span-2 space-y-4">
            <div>
              <div className="label-eyebrow mb-2">Case narrative</div>
              <p className="text-sm text-slate-300 leading-relaxed">{c.description}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="label-eyebrow mb-2">Complainant</div>
                <div className="text-sm">{c.complainant?.name || "—"}</div>
                <div className="text-xs text-slate-400">{c.complainant?.phone} · {c.complainant?.address}</div>
              </div>
              <div>
                <div className="label-eyebrow mb-2">Investigating Officer</div>
                <div className="text-sm">{c.io_officer}</div>
                <div className="text-xs text-slate-400">{c.court}</div>
              </div>
            </div>
          </div>

          <div className="glass p-5">
            <div className="label-eyebrow mb-3">Timeline</div>
            <ol className="relative border-l border-white/10 ml-2 space-y-4">
              <li className="ml-4">
                <div className="w-2 h-2 rounded-full bg-[#00E5FF] absolute -left-1" />
                <div className="text-xs text-slate-400">{c.date_registered}</div>
                <div className="text-sm">FIR filed at {c.unit}</div>
              </li>
              {(c.arrests || []).map((a, i) => (
                <li key={i} className="ml-4">
                  <div className="w-2 h-2 rounded-full bg-amber-400 absolute -left-1" />
                  <div className="text-xs text-slate-400">{a.date}</div>
                  <div className="text-sm">Arrest: {a.person} by {a.officer}</div>
                </li>
              ))}
              {c.chargesheet && (
                <li className="ml-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 absolute -left-1" />
                  <div className="text-xs text-slate-400">{c.chargesheet.filed_date}</div>
                  <div className="text-sm">Chargesheet filed · {(c.chargesheet.sections||[]).join(", ")}</div>
                </li>
              )}
            </ol>
          </div>
        </div>
      )}

      {!editMode && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass p-5">
              <div className="flex items-center gap-2 mb-3"><UsersIcon className="w-4 h-4 text-[#00E5FF]" /><div className="label-eyebrow">Victims ({c.victims?.length || 0})</div></div>
              <div className="space-y-2">
                {(c.victims||[]).map((v,i) => (
                  <div key={i} className="p-3 rounded-lg border border-white/10 bg-white/5">
                    <div className="text-sm font-medium">{v.name}</div>
                    <div className="text-xs text-slate-400">{v.gender}, age {v.age} · {v.contact}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass p-5">
              <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-red-400" /><div className="label-eyebrow">Accused ({c.accused?.length || 0})</div></div>
              <div className="space-y-2">
                {(c.accused||[]).map((a,i) => (
                  <div key={i} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.gender}, age {a.age} · {a.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass p-5">
            <div className="label-eyebrow mb-3">Similar cases (AI similarity)</div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {similar.map(s => (
                <Link key={s.id} to={`/app/cases/${s.id}`} className="p-3 rounded-lg border border-white/10 bg-white/5 hover:border-[#00E5FF]/40 transition-colors" data-testid={`similar-${s.fir_no}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#00E5FF] text-xs">{s.fir_no}</span>
                    <span className="text-xs text-emerald-400 font-mono">{s.match_score}%</span>
                  </div>
                  <div className="text-sm mt-1">{s.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.district}</div>
                </Link>
              ))}
              {similar.length === 0 && <div className="text-xs text-slate-500">No similar cases yet.</div>}
            </div>
          </div>

          {report && (
            <div className="glass p-6" data-testid="ai-report-panel">
              <div className="flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-[#00E5FF]" /><div className="label-eyebrow">Kavacha AI Investigation Summary</div></div>
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-200 leading-relaxed">{report.replace(/\*\*/g,"").replace(/__/g,"")}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

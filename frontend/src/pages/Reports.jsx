import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Sparkles, Loader2, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Reports() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [statusF, setStatusF] = useState("");
  const [severity, setSeverity] = useState("");

  useEffect(() => { api.get("/cases?limit=500").then(({data}) => setCases(data)); }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return cases.filter(c => {
      if (district && c.district !== district) return false;
      if (statusF && c.status !== statusF) return false;
      if (severity && c.severity !== severity) return false;
      if (!ql) return true;
      return (
        c.fir_no.toLowerCase().includes(ql) ||
        c.title.toLowerCase().includes(ql) ||
        (c.district||"").toLowerCase().includes(ql) ||
        (c.crime_head||"").toLowerCase().includes(ql) ||
        (c.location||"").toLowerCase().includes(ql) ||
        (c.io_officer||"").toLowerCase().includes(ql)
      );
    });
  }, [cases, q, district, statusF, severity]);

  const districts = useMemo(() => Array.from(new Set(cases.map(c => c.district))).sort(), [cases]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(4,9,20); doc.rect(0,0,220,20,"F");
    doc.setTextColor(0,229,255); doc.setFontSize(16);
    doc.text("Namma Kavacha · Case Register Report", 10, 13);
    doc.setTextColor(148,163,184); doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filtered.length} cases${q?` · search: "${q}"`:""}`, 10, 25);
    autoTable(doc, {
      startY: 30,
      head: [["FIR", "Title", "District", "Category", "Status", "Severity", "Date"]],
      body: filtered.map(c => [c.fir_no, c.title, c.district, `${c.crime_head}/${c.crime_sub_head}`, c.status, c.severity, c.date_registered]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0,229,255], textColor: [4,9,20] },
      alternateRowStyles: { fillColor: [11,19,43] },
      bodyStyles: { textColor: [30,30,40] },
    });
    doc.save("namma-kavacha-cases.pdf");
    toast.success(`PDF exported (${filtered.length} cases)`);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(c => ({
      FIR: c.fir_no, Title: c.title, District: c.district, Category: c.crime_head,
      SubCategory: c.crime_sub_head, Status: c.status, Severity: c.severity,
      Date: c.date_registered, Location: c.location, IO: c.io_officer,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cases");
    XLSX.writeFile(wb, "namma-kavacha-cases.xlsx");
    toast.success(`Excel exported (${filtered.length} cases)`);
  };

  const aiReport = async (cid) => {
    setBusy(cid);
    try {
      const { data } = await api.post(`/kavacha/report/${cid}`);
      const doc = new jsPDF();
      doc.setFillColor(4,9,20); doc.rect(0,0,220,20,"F");
      doc.setTextColor(0,229,255); doc.setFontSize(14);
      doc.text(`Namma Kavacha · Investigation Summary`, 10, 13);
      doc.setTextColor(30,30,30); doc.setFontSize(10);
      doc.text(`FIR: ${data.fir_no}`, 10, 28);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(data.report, 190);
      doc.text(lines, 10, 38);
      doc.save(`report-${data.fir_no.replace(/\//g,'-')}.pdf`);
      toast.success("AI report exported");
    } catch { toast.error("Report failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-5" data-testid="reports-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Reports & Export</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Auditable exports</h1>
          <div className="text-xs text-slate-400 mt-1"><span className="font-mono text-[#00E5FF]">{filtered.length}</span> of {cases.length} cases match filters</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary inline-flex items-center gap-2" onClick={exportPDF} data-testid="export-pdf-btn"><FileDown className="w-4 h-4"/> Export register (PDF)</button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={exportXLSX} data-testid="export-xlsx-btn"><FileSpreadsheet className="w-4 h-4"/> Export register (Excel)</button>
        </div>
      </div>

      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-dark pl-9" placeholder="Search FIR, title, district, category, IO officer…" value={q} onChange={e=>setQ(e.target.value)} data-testid="reports-search-input"/>
        </div>
        <select className="input-dark max-w-48" value={district} onChange={e=>setDistrict(e.target.value)} data-testid="reports-filter-district">
          <option value="">All districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-dark max-w-48" value={statusF} onChange={e=>setStatusF(e.target.value)} data-testid="reports-filter-status">
          <option value="">All statuses</option>
          {["Open","Under Investigation","Chargesheeted","Closed"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input-dark max-w-40" value={severity} onChange={e=>setSeverity(e.target.value)} data-testid="reports-filter-severity">
          <option value="">All severities</option>
          {["Low","Medium","High","Critical"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {user?.role !== "supervisor" && (
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">AI investigation summaries — filtered</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {filtered.slice(0, 60).map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-white/10 bg-white/5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-[#00E5FF]">{c.fir_no}</div>
                  <div className="text-sm truncate">{c.title}</div>
                  <div className="text-[10px] text-slate-500">{c.district} · {c.status}</div>
                </div>
                <button className="btn-secondary shrink-0 inline-flex items-center gap-1 text-xs" onClick={() => aiReport(c.id)} disabled={busy===c.id} data-testid={`ai-report-${c.fir_no}`}>
                  {busy===c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Report
                </button>
              </div>
            ))}
            {filtered.length === 0 && <div className="text-xs text-slate-500 col-span-full text-center py-6">No cases match. Adjust filters.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

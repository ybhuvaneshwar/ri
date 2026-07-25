import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Reports() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => { api.get("/cases?limit=200").then(({data}) => setCases(data)); }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(4,9,20); doc.rect(0,0,220,20,"F");
    doc.setTextColor(0,229,255); doc.setFontSize(16);
    doc.text("Namma Kavacha · Case Register Report", 10, 13);
    doc.setTextColor(148,163,184); doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${cases.length} cases`, 10, 25);
    autoTable(doc, {
      startY: 30,
      head: [["FIR", "Title", "District", "Category", "Status", "Severity", "Date"]],
      body: cases.map(c => [c.fir_no, c.title, c.district, `${c.crime_head}/${c.crime_sub_head}`, c.status, c.severity, c.date_registered]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0,229,255], textColor: [4,9,20] },
      alternateRowStyles: { fillColor: [11,19,43] },
      bodyStyles: { textColor: [30,30,40] },
    });
    doc.save("namma-kavacha-cases.pdf");
    toast.success("PDF exported");
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(cases.map(c => ({
      FIR: c.fir_no, Title: c.title, District: c.district, Category: c.crime_head,
      SubCategory: c.crime_sub_head, Status: c.status, Severity: c.severity,
      Date: c.date_registered, Location: c.location, IO: c.io_officer,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cases");
    XLSX.writeFile(wb, "namma-kavacha-cases.xlsx");
    toast.success("Excel exported");
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
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary inline-flex items-center gap-2" onClick={exportPDF} data-testid="export-pdf-btn"><FileDown className="w-4 h-4"/> Export register (PDF)</button>
          <button className="btn-primary inline-flex items-center gap-2" onClick={exportXLSX} data-testid="export-xlsx-btn"><FileSpreadsheet className="w-4 h-4"/> Export register (Excel)</button>
        </div>
      </div>

      {user?.role !== "supervisor" && (
        <div className="glass p-5">
          <div className="label-eyebrow mb-3">AI investigation summaries — per case</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {cases.slice(0, 30).map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-white/10 bg-white/5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-[#00E5FF]">{c.fir_no}</div>
                  <div className="text-sm truncate">{c.title}</div>
                </div>
                <button className="btn-secondary shrink-0 inline-flex items-center gap-1 text-xs" onClick={() => aiReport(c.id)} disabled={busy===c.id} data-testid={`ai-report-${c.fir_no}`}>
                  {busy===c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { api, API } from "@/lib/api";
import { Upload, FileSpreadsheet, FileText, Loader2, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";

export default function Uploads() {
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [xlsxResult, setXlsxResult] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  const downloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      const token = localStorage.getItem("nk_token");
      const res = await fetch(`${API}/data/template`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Template download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "namma-kavacha-template.xlsx";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded");
    } catch (e) { toast.error(e.message || "Failed"); }
    finally { setTemplateBusy(false); }
  };

  const uploadExcel = async (file) => {
    if (!file) return;
    setXlsxBusy(true); setXlsxResult(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/upload/excel", fd, { headers: {"Content-Type":"multipart/form-data"} });
      setXlsxResult(data);
      toast.success(`Imported ${data.imported} records — live across dashboard.`);
    } catch (e) { toast.error(e.response?.data?.detail || "Upload failed"); }
    finally { setXlsxBusy(false); }
  };

  const uploadPDF = async (file) => {
    if (!file) return;
    setPdfBusy(true); setPdfResult(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/upload/pdf-extract", fd, { headers: {"Content-Type":"multipart/form-data"} });
      setPdfResult(data);
      toast.success("Extraction complete — review below.");
    } catch (e) { toast.error(e.response?.data?.detail || "Extraction failed"); }
    finally { setPdfBusy(false); }
  };

  const commitPDF = async () => {
    if (!pdfResult?.extracted) return;
    try {
      const r = await api.post("/cases", pdfResult.extracted);
      toast.success(`Case ${r.data.fir_no} added`);
      setPdfResult(null);
    } catch (e) { toast.error("Save failed — check extracted fields"); }
  };

  return (
    <div className="space-y-5" data-testid="uploads-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Data Ingestion</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Sync Excel & PDF sources</h1>
          <p className="text-sm text-slate-400 mt-1">Uploads are validated and applied live — no restarts, no manual refresh.</p>
        </div>
        <button onClick={downloadTemplate} disabled={templateBusy} className="btn-secondary inline-flex items-center gap-2" data-testid="download-template-btn">
          {templateBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
          Download Excel template
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-3"><FileSpreadsheet className="w-5 h-5 text-emerald-400"/><div className="label-eyebrow">Excel sync</div></div>
          <p className="text-xs text-slate-400 mb-3">
            Upload an .xlsx with a <span className="font-mono text-[#00E5FF]">CaseMaster</span> (or <span className="font-mono text-[#00E5FF]">FIR_Data</span>) sheet.
            Need the columns? Grab the template above.
          </p>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-white/10 hover:border-[#00E5FF]/40 rounded-xl p-8 text-center transition-colors">
              {xlsxBusy ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00E5FF]"/> : <Upload className="w-6 h-6 mx-auto text-slate-400"/>}
              <div className="mt-2 text-sm">{xlsxBusy ? "Importing…" : "Click to select .xlsx"}</div>
            </div>
            <input type="file" accept=".xlsx" className="hidden" onChange={e => uploadExcel(e.target.files?.[0])} data-testid="upload-xlsx-input"/>
          </label>
          {xlsxResult && (
            <div className="mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4"/>Imported {xlsxResult.imported} records</div>
              {xlsxResult.errors?.length ? <div className="text-xs text-amber-400 mt-1">{xlsxResult.errors.length} rows failed</div> : null}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-[#00E5FF]"/><div className="label-eyebrow">PDF ingestion (AI extraction)</div></div>
          <p className="text-xs text-slate-400 mb-3">Upload an FIR PDF. Kavacha AI extracts structured fields — review and commit.</p>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-white/10 hover:border-[#00E5FF]/40 rounded-xl p-8 text-center transition-colors">
              {pdfBusy ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#00E5FF]"/> : <Upload className="w-6 h-6 mx-auto text-slate-400"/>}
              <div className="mt-2 text-sm">{pdfBusy ? "Extracting…" : "Click to select .pdf"}</div>
            </div>
            <input type="file" accept=".pdf" className="hidden" onChange={e => uploadPDF(e.target.files?.[0])} data-testid="upload-pdf-input"/>
          </label>
          {pdfResult?.extracted && (
            <div className="mt-3 space-y-2">
              <div className="label-eyebrow">Review & confirm</div>
              <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-lg overflow-x-auto max-h-64">{JSON.stringify(pdfResult.extracted, null, 2)}</pre>
              <button className="btn-primary" onClick={commitPDF} data-testid="commit-pdf-btn">Commit case</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

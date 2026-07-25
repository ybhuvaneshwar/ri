import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { API } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, X } from "lucide-react";

/** Global contextual AI side-panel available from every screen.
 * The current route + page title are injected as context for the AI. */
export default function AiSidePanel({ open, onOpenChange }) {
  const loc = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [session] = useState(() => `panel-${Date.now()}`);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMessages([{ role:"assistant", content: `Ready to help on **${loc.pathname}**. Ask about this page or any case.` }]);
    }
  }, [open, loc.pathname]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput(""); setBusy(true);
    setMessages(m => [...m, { role:"user", content: q }, { role:"assistant", content: "" }]);
    try {
      const token = localStorage.getItem("nk_token");
      const contextualMessage = `[Officer is viewing ${loc.pathname}] ${q}`;
      const res = await fetch(`${API}/kavacha/chat`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: contextualMessage, session_id: session }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const chunk of parts) {
          if (!chunk.startsWith("data:")) continue;
          try {
            const j = JSON.parse(chunk.slice(5).trim());
            if (j.delta) {
              setMessages(m => {
                const last = m[m.length-1];
                return [...m.slice(0,-1), { ...last, content: last.content + j.delta }];
              });
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(m => [...m.slice(0,-1), { role:"assistant", content: "Sorry — couldn't reach Kavacha AI." }]);
    } finally { setBusy(false); }
  };

  const renderContent = (text) => {
    const cleaned = (text || "").replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s+/gm, "");
    const parts = cleaned.split(/(\[FIR\/[^\]]+\])/g);
    return parts.map((p, i) => /^\[FIR\/.+\]$/.test(p)
      ? <span key={i} className="text-[#00E5FF] font-mono text-xs bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 mx-0.5">{p}</span>
      : <span key={i}>{p}</span>);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="bg-[#0B132B]/95 backdrop-blur-2xl border-l border-white/10 text-white w-[440px] sm:max-w-[440px] p-0 flex flex-col" data-testid="ai-panel" aria-describedby={undefined}>
        <SheetHeader className="p-4 border-b border-white/10 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div>
              <SheetTitle className="text-white text-base">Kavacha AI</SheetTitle>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Contextual · {loc.pathname}</div>
            </div>
          </div>
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${m.role==="user" ? "bg-white/10" : "bg-[#00E5FF]/15 border border-[#00E5FF]/40"}`}>
                {m.role === "user" ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-[#00E5FF]" />}
              </div>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm ${m.role==="user" ? "bg-[#00E5FF] text-[#040914]" : "bg-white/5 border border-white/10"}`}>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.role === "user" ? m.content : renderContent(m.content || (busy && m.role==="assistant" ? "▍" : ""))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input className="input-dark flex-1 text-sm" placeholder="Ask about this page…" value={input}
            onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && send()} data-testid="ai-panel-input" />
          <button className="btn-primary" onClick={send} disabled={busy} data-testid="ai-panel-send">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

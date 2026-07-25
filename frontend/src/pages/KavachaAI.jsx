import React, { useRef, useState } from "react";
import { API } from "@/lib/api";
import { Send, Sparkles, Loader2, Bot, User as UserIcon } from "lucide-react";

const SUGGESTIONS = [
  "Show me the top crime hotspots in Bengaluru this month",
  "Which districts have the highest cyber-fraud volume?",
  "Find cases connected to Ravi Kumar",
  "Summarize open critical cases in Mysuru",
];

export default function KavachaAI() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "I'm **Kavacha AI**, your crime intelligence copilot. Ask me about any case, entity, district, or pattern. I cite specific FIRs in every answer." }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [session] = useState(() => `sess-${Date.now()}`);
  const scrollRef = useRef(null);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setMessages(m => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("nk_token");
      const res = await fetch(`${API}/kavacha/chat`, {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: q, session_id: session }),
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
          const payload = chunk.slice(5).trim();
          try {
            const j = JSON.parse(payload);
            if (j.delta) {
              setMessages(m => {
                const last = m[m.length-1];
                return [...m.slice(0,-1), { ...last, content: last.content + j.delta }];
              });
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
            }
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (e) {
      setMessages(m => [...m.slice(0,-1), { role: "assistant", content: "Sorry — I couldn't process that. Please try again." }]);
    } finally { setBusy(false); }
  };

  const renderContent = (text) => {
    // highlight FIR citations
    const parts = text.split(/(\[FIR\/[^\]]+\])/g);
    return parts.map((p, i) => /^\[FIR\/.+\]$/.test(p)
      ? <span key={i} className="text-[#00E5FF] font-mono text-xs bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 mx-0.5">{p}</span>
      : <span key={i}>{p}</span>);
  };

  return (
    <div className="grid lg:grid-cols-4 gap-4 h-[calc(100vh-140px)]" data-testid="kavacha-page">
      <div className="lg:col-span-3 glass flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div>
            <div className="font-semibold">Kavacha AI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Claude Sonnet 4.5 · cited answers</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${m.role==="user" ? "bg-white/10" : "bg-[#00E5FF]/15 border border-[#00E5FF]/40"}`}>
                {m.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-[#00E5FF]" />}
              </div>
              <div className={`max-w-[85%] p-4 rounded-2xl ${m.role==="user" ? "bg-[#00E5FF] text-[#040914]" : "glass"}`}
                   data-testid={`msg-${m.role}-${i}`}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(m.content || (busy && m.role==="assistant" ? "▍" : ""))}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input className="input-dark flex-1" placeholder="Ask Kavacha AI…" value={input}
              onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && send()}
              data-testid="kavacha-input" />
            <button className="btn-primary" onClick={()=>send()} disabled={busy} data-testid="kavacha-send-btn">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="glass p-5 space-y-4">
        <div>
          <div className="label-eyebrow mb-2">Try asking</div>
          <div className="space-y-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={()=>send(s)} className="text-left text-sm w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:border-[#00E5FF]/40 hover:bg-white/10 transition-colors" data-testid="kavacha-suggestion">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 text-xs text-slate-400 space-y-2">
          <div className="label-eyebrow">Capabilities</div>
          <div>› Cites specific FIR numbers</div>
          <div>› Cross-links entities across cases</div>
          <div>› Explains predictions & anomalies</div>
          <div>› Drafts investigation summaries</div>
        </div>
      </div>
    </div>
  );
}

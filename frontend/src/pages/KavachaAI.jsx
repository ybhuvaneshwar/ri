import React, { useRef, useState } from "react";
import { API } from "@/lib/api";
import { Send, Sparkles, Loader2, Bot, User as UserIcon, Languages } from "lucide-react";

const SUGGESTIONS_EN = [
  "Show me the top crime hotspots in Bengaluru this month",
  "Which districts have the highest cyber-fraud volume?",
  "Find repeat accused across multiple cases",
  "Summarize open critical cases",
];
const SUGGESTIONS_KN = [
  "ಈ ತಿಂಗಳಿನ ಬೆಂಗಳೂರಿನ ಪ್ರಮುಖ ಅಪರಾಧ ತಾಣಗಳನ್ನು ತೋರಿಸಿ",
  "ಯಾವ ಜಿಲ್ಲೆಗಳಲ್ಲಿ ಸೈಬರ್ ವಂಚನೆ ಪ್ರಕರಣಗಳು ಹೆಚ್ಚು?",
  "ಬಹು ಪ್ರಕರಣಗಳಲ್ಲಿ ಕಂಡುಬಂದ ಪುನರಾವರ್ತಿತ ಆರೋಪಿಗಳನ್ನು ಹುಡುಕಿ",
  "ತೆರೆದಿರುವ ಗಂಭೀರ ಪ್ರಕರಣಗಳ ಸಾರಾಂಶ",
];

/** Cleanly render assistant text — strip markdown bold, highlight FIR citations, respect newlines. */
function renderAssistantContent(text) {
  const cleaned = (text || "").replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s+/gm, "");
  const parts = cleaned.split(/(\[FIR\/[^\]]+\])/g);
  return parts.map((p, i) =>
    /^\[FIR\/.+\]$/.test(p)
      ? <span key={i} className="text-[#00E5FF] font-mono text-xs bg-[#00E5FF]/10 px-1.5 py-0.5 rounded border border-[#00E5FF]/20 mx-0.5">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export default function KavachaAI() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Namaskara! I am Kavacha AI, your crime intelligence copilot. Ask me anything about cases, accused persons, districts, or patterns — in English or in Kannada (ಕನ್ನಡ ದಲ್ಲಿ ಸಹ ಕೇಳಬಹುದು). I cite specific FIRs in every answer." }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [session] = useState(() => `sess-${Date.now()}`);
  const [inputLang, setInputLang] = useState("auto"); // auto | en | kn
  const scrollRef = useRef(null);

  const isKannada = (text) => /[\u0C80-\u0CFF]/.test(text);

  const send = async (text) => {
    let q = (text ?? input).trim();
    if (!q || busy) return;
    // Prepend language directive if user forces one
    if (inputLang === "kn" && !isKannada(q)) q = `[ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ] ${q}`;
    if (inputLang === "en" && isKannada(q)) q = `[Respond in English] ${q}`;

    setInput("");
    setBusy(true);
    setMessages(m => [...m, { role: "user", content: (text ?? input).trim() }, { role: "assistant", content: "" }]);

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
      setMessages(m => [...m.slice(0,-1), { role: "assistant", content: "Sorry — I couldn't process that. Please try again." }]);
    } finally { setBusy(false); }
  };

  const suggestions = inputLang === "kn" ? SUGGESTIONS_KN : SUGGESTIONS_EN;

  return (
    <div className="grid lg:grid-cols-4 gap-4 h-[calc(100vh-140px)]" data-testid="kavacha-page">
      <div className="lg:col-span-3 glass flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div>
              <div className="font-semibold">Kavacha AI</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Claude Sonnet 4.5 · bilingual · cited</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <Languages className="w-3.5 h-3.5 text-slate-400 ml-1" />
            {[["auto","Auto"],["en","EN"],["kn","ಕನ್ನಡ"]].map(([k, label]) => (
              <button key={k} onClick={()=>setInputLang(k)}
                className={`text-[11px] px-2 py-1 rounded-md transition-colors ${inputLang===k?"bg-[#00E5FF] text-[#040914] font-semibold":"text-slate-400 hover:text-white"}`}
                data-testid={`kavacha-lang-${k}`}>{label}</button>
            ))}
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
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.role === "user" ? m.content : renderAssistantContent(m.content || (busy && m.role==="assistant" ? "▍" : ""))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input className="input-dark flex-1" placeholder={inputLang==="kn" ? "ಕವಚ AI ಗೆ ಕೇಳಿ…" : "Ask Kavacha AI…"} value={input}
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
            {suggestions.map(s => (
              <button key={s} onClick={()=>send(s)} className="text-left text-sm w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:border-[#00E5FF]/40 hover:bg-white/10 transition-colors" data-testid="kavacha-suggestion">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 text-xs text-slate-400 space-y-2">
          <div className="label-eyebrow">Capabilities</div>
          <div>› Bilingual — English & ಕನ್ನಡ (auto-detect)</div>
          <div>› Plain human-readable answers</div>
          <div>› Cites specific FIR numbers</div>
          <div>› Explains predictions & anomalies</div>
          <div>› Drafts investigation summaries</div>
        </div>
      </div>
    </div>
  );
}

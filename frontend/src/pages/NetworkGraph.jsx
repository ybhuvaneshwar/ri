import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { api } from "@/lib/api";
import { Loader2, Filter, X, Users as UsersIcon, Building2, Layers, Search, GitBranch, ArrowRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NODE_COLOR = {
  case_Critical: "#EF4444", case_High: "#F97316", case_Medium: "#F59E0B", case_Low: "#94A3B8",
  case: "#00E5FF", accused: "#EF4444", victim: "#10B981", person: "#F59E0B",
};

export default function NetworkGraph() {
  const [data, setData] = useState(null);
  const [facets, setFacets] = useState({ districts: [], crime_heads: [] });
  const [district, setDistrict] = useState("");
  const [crimeHead, setCrimeHead] = useState("");
  const [entity, setEntity] = useState("");
  const [relKind, setRelKind] = useState("all"); // all | accused | victim
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const fgRef = useRef();
  const containerRef = useRef();
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (district) params.set("district", district);
    if (crimeHead) params.set("crime_head", crimeHead);
    if (entity) params.set("entity", entity);
    params.set("limit", "300");
    try {
      const { data } = await api.get(`/network/graph?${params.toString()}`);
      setData(data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    api.get("/network/facets").then(({data}) => setFacets(data));
    load();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const measure = () => { if (containerRef.current) setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight }); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [data]);

  const clear = () => { setDistrict(""); setCrimeHead(""); setEntity(""); setRelKind("all"); setSelectedNode(null); setTimeout(load, 10); };

  const filteredGraph = useMemo(() => {
    if (!data) return null;
    if (relKind === "all") return data;
    // Filter links by kind and only include connected nodes
    const links = data.links.filter(l => l.kind === relKind);
    const keep = new Set();
    links.forEach(l => {
      keep.add(typeof l.source === "object" ? l.source.id : l.source);
      keep.add(typeof l.target === "object" ? l.target.id : l.target);
    });
    // Always keep case nodes even if isolated (to show the case with its filtered relationship)
    const nodes = data.nodes.filter(n => keep.has(n.id) || (n.type === "case" && relKind === "victim"));
    return { nodes, links };
  }, [data, relKind]);

  const stats = useMemo(() => {
    if (!filteredGraph) return null;
    const cases = filteredGraph.nodes.filter(n => n.type === "case").length;
    const accused = filteredGraph.nodes.filter(n => n.type === "accused").length;
    const victims = filteredGraph.nodes.filter(n => n.type === "victim").length;
    return { cases, accused, victims, links: filteredGraph.links.length };
  }, [filteredGraph]);

  // Compute relationships for the selected node
  const relatedForSelected = useMemo(() => {
    if (!selectedNode || !data) return null;
    const conns = data.links.filter(l => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return s === selectedNode.id || t === selectedNode.id;
    });
    const relatedIds = new Set();
    conns.forEach(l => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      relatedIds.add(s === selectedNode.id ? t : s);
    });
    const cases = [];
    const persons = [];
    data.nodes.forEach(n => {
      if (!relatedIds.has(n.id)) return;
      if (n.type === "case") cases.push(n); else persons.push(n);
    });
    return { cases, persons, links: conns };
  }, [selectedNode, data]);

  const focusNode = (node) => {
    if (!fgRef.current) return;
    const distance = 60;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current.cameraPosition({ x: (node.x||0) * distRatio, y: (node.y||0) * distRatio, z: (node.z||0) * distRatio }, node, 1200);
  };

  return (
    <div className="space-y-4" data-testid="network-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Criminal Network Analysis</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Relationship graph</h1>
        </div>
        {stats && (
          <div className="text-xs text-slate-400 flex gap-4">
            <span><span className="font-mono text-[#00E5FF]">{stats.cases}</span> cases</span>
            <span><span className="font-mono text-red-400">{stats.accused}</span> accused</span>
            <span><span className="font-mono text-emerald-400">{stats.victims}</span> victims</span>
            <span><span className="font-mono text-[#00E5FF]">{stats.links}</span> links</span>
          </div>
        )}
      </div>

      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#00E5FF]" />
          <div className="label-eyebrow">Filter linkages</div>
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> District</div>
            <select className="input-dark" value={district} onChange={e=>setDistrict(e.target.value)} data-testid="network-filter-district">
              <option value="">All districts</option>
              {facets.districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Layers className="w-3 h-3"/> Crime category</div>
            <select className="input-dark" value={crimeHead} onChange={e=>setCrimeHead(e.target.value)} data-testid="network-filter-crime">
              <option value="">All categories</option>
              {facets.crime_heads.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><GitBranch className="w-3 h-3"/> Relationship type</div>
            <select className="input-dark" value={relKind} onChange={e=>setRelKind(e.target.value)} data-testid="network-filter-relation">
              <option value="all">All linkages</option>
              <option value="accused">Accused only</option>
              <option value="victim">Victims only</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><UsersIcon className="w-3 h-3"/> Entity search</div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input-dark pl-8" placeholder="Name or FIR"
                value={entity} onChange={e=>setEntity(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load()}
                data-testid="network-filter-entity" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-primary flex-1" onClick={load} data-testid="network-apply">Apply</button>
            <button className="btn-secondary" onClick={clear} data-testid="network-clear"><X className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <div className={selectedNode ? "lg:col-span-3" : "lg:col-span-4"}>
          <div ref={containerRef} className="glass overflow-hidden relative" style={{height: "calc(100vh - 340px)", minHeight: 460}}>
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-[#040914]/40 z-10"><Loader2 className="w-6 h-6 animate-spin text-[#00E5FF]" /></div>}
            {filteredGraph && (
              <ForceGraph3D
                ref={fgRef}
                graphData={filteredGraph}
                width={dims.w}
                height={dims.h}
                backgroundColor="rgba(0,0,0,0)"
                nodeLabel={n => {
                  if (n.type === "case") return `FIR ${n.name}\n${n.label}\n${n.district} · ${n.severity}`;
                  if (n.type === "accused") return `Accused: ${n.name}`;
                  if (n.type === "victim") return `Victim: ${n.name}`;
                  return n.name;
                }}
                nodeColor={n => {
                  if (n.type === "case") return NODE_COLOR[`case_${n.severity}`] || NODE_COLOR.case;
                  return NODE_COLOR[n.type] || "#94A3B8";
                }}
                nodeRelSize={4}
                linkColor={l => l.kind === "victim" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}
                linkWidth={0.7}
                linkOpacity={0.5}
                enableNodeDrag={true}
                onNodeClick={(node) => {
                  setSelectedNode(node);
                  focusNode(node);
                }}
              />
            )}
            <div className="absolute bottom-3 left-3 glass p-3 text-xs space-y-1.5 max-w-xs" data-testid="network-legend">
              <div className="label-eyebrow">Legend</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Critical case / Accused</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> High severity</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> Case</div>
              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Victim</div>
              <div className="text-slate-500 mt-1">Click any node to see relationships.</div>
            </div>
          </div>
        </div>

        {selectedNode && (
          <aside className="glass p-4 space-y-4 max-h-[calc(100vh-340px)] overflow-y-auto" data-testid="network-selected-panel">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="label-eyebrow">Selected {selectedNode.type}</div>
                <div className="text-lg font-semibold mt-1 break-words">{selectedNode.name}</div>
                {selectedNode.district && <div className="text-xs text-slate-400 mt-0.5">{selectedNode.district} · {selectedNode.severity}</div>}
                {selectedNode.label && selectedNode.label !== selectedNode.name && <div className="text-xs text-slate-300 mt-1">{selectedNode.label}</div>}
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white shrink-0" data-testid="close-selected"><X className="w-4 h-4"/></button>
            </div>

            {selectedNode.type === "case" && (
              <button className="btn-primary w-full inline-flex items-center justify-center gap-2" onClick={()=>nav(`/app/cases/${selectedNode.id.replace("case:","")}`)} data-testid="open-case-detail">
                <ExternalLink className="w-4 h-4"/> Open case detail
              </button>
            )}
            {(selectedNode.type === "accused" || selectedNode.type === "victim") && (
              <button className="btn-primary w-full inline-flex items-center justify-center gap-2" onClick={()=>{ setEntity(selectedNode.name); setSelectedNode(null); setTimeout(load, 10); }} data-testid="refilter-on-entity">
                <Filter className="w-4 h-4"/> Show only their network
              </button>
            )}

            {relatedForSelected && relatedForSelected.cases.length > 0 && (
              <div>
                <div className="label-eyebrow mb-2">Linked cases ({relatedForSelected.cases.length})</div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {relatedForSelected.cases.map(cn => (
                    <button key={cn.id} onClick={()=>nav(`/app/cases/${cn.id.replace("case:","")}`)}
                      className="w-full text-left p-2.5 rounded-lg border border-white/10 bg-white/5 hover:border-[#00E5FF]/40 hover:bg-white/10 transition-colors group"
                      data-testid={`related-case-${cn.name}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#00E5FF]">{cn.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-[#00E5FF]"/>
                      </div>
                      <div className="text-xs text-slate-200 mt-0.5 truncate">{cn.label}</div>
                      <div className="text-[10px] text-slate-500">{cn.district} · {cn.severity}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {relatedForSelected && relatedForSelected.persons.length > 0 && (
              <div>
                <div className="label-eyebrow mb-2">Linked persons ({relatedForSelected.persons.length})</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {relatedForSelected.persons.map(pn => (
                    <button key={pn.id} onClick={()=>{ setSelectedNode(pn); setEntity(pn.name); setTimeout(load, 10); }}
                      className="w-full text-left p-2 rounded-lg border border-white/10 bg-white/5 hover:border-[#00E5FF]/40 transition-colors flex items-center gap-2"
                      data-testid={`related-person-${pn.name}`}>
                      <span className={`w-2 h-2 rounded-full ${pn.type==="accused"?"bg-red-500":"bg-emerald-500"}`}/>
                      <span className="text-sm text-slate-200 truncate flex-1">{pn.name}</span>
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">{pn.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {relatedForSelected && relatedForSelected.cases.length === 0 && relatedForSelected.persons.length === 0 && (
              <div className="text-xs text-slate-500">No linkages in current view.</div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { api } from "@/lib/api";
import { Loader2, Filter, X, Users as UsersIcon, Building2, Layers, Search } from "lucide-react";
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

  const clear = () => { setDistrict(""); setCrimeHead(""); setEntity(""); setTimeout(load, 10); };

  const stats = useMemo(() => {
    if (!data) return null;
    const cases = data.nodes.filter(n => n.type === "case").length;
    const accused = data.nodes.filter(n => n.type === "accused").length;
    const victims = data.nodes.filter(n => n.type === "victim").length;
    return { cases, accused, victims, links: data.links.length };
  }, [data]);

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

      {/* Filter panel */}
      <div className="glass p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#00E5FF]" />
          <div className="label-eyebrow">Filter linkages</div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3"/> District / Station</div>
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
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1"><UsersIcon className="w-3 h-3"/> Entity (accused / victim / IO / FIR)</div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input-dark pl-8" placeholder="Name or FIR fragment"
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

      <div ref={containerRef} className="glass overflow-hidden relative" style={{height: "calc(100vh - 320px)", minHeight: 480}}>
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-[#040914]/40 z-10"><Loader2 className="w-6 h-6 animate-spin text-[#00E5FF]" /></div>}
        {data && (
          <ForceGraph3D
            ref={fgRef}
            graphData={data}
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
              if (node.type === "case") {
                const id = node.id.replace("case:", "");
                nav(`/app/cases/${id}`);
                return;
              }
              // For entities, refilter the graph on that entity
              setEntity(node.name);
              setTimeout(load, 10);
              const distance = 60;
              const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
              fgRef.current?.cameraPosition({ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, node, 1500);
            }}
          />
        )}
        <div className="absolute bottom-3 left-3 glass p-3 text-xs space-y-1.5 max-w-xs" data-testid="network-legend">
          <div className="label-eyebrow">Legend</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Critical case / Accused</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> High severity case</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> Case</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Victim</div>
          <div className="text-slate-500 mt-1">Click a case node to open; click a person to refilter on them.</div>
        </div>
      </div>

      {selectedNode && (
        <div className="glass p-4" data-testid="network-selected">
          <div className="label-eyebrow mb-1">Selected node</div>
          <div className="text-sm">
            <span className="font-semibold">{selectedNode.name}</span>
            <span className="text-slate-400 ml-2">({selectedNode.type})</span>
          </div>
          {selectedNode.district && <div className="text-xs text-slate-400 mt-1">{selectedNode.district} · {selectedNode.severity}</div>}
        </div>
      )}
    </div>
  );
}

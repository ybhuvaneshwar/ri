import React, { useEffect, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NetworkGraph() {
  const [data, setData] = useState(null);
  const fgRef = useRef();
  const containerRef = useRef();
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const nav = useNavigate();

  useEffect(() => {
    api.get("/network/graph").then(({data}) => setData(data));
  }, []);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [data]);

  return (
    <div className="space-y-4" data-testid="network-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Criminal Network Analysis</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Relationship graph</h1>
        </div>
        {data && <div className="text-xs text-slate-400"><span className="font-mono text-[#00E5FF]">{data.nodes.length}</span> nodes · <span className="font-mono text-[#00E5FF]">{data.links.length}</span> links</div>}
      </div>

      <div ref={containerRef} className="glass overflow-hidden relative" style={{height: "calc(100vh - 220px)"}}>
        {!data && <div className="absolute inset-0 flex items-center justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>}
        {data && (
          <ForceGraph3D
            ref={fgRef}
            graphData={data}
            width={dims.w}
            height={dims.h}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={n => `${n.type === "case" ? "FIR" : "Person"}: ${n.name}`}
            nodeColor={n => n.type === "case" ? (n.severity === "Critical" ? "#EF4444" : "#00E5FF") : "#F59E0B"}
            nodeRelSize={4}
            linkColor={() => "rgba(0, 229, 255, 0.3)"}
            linkWidth={0.6}
            linkOpacity={0.5}
            enableNodeDrag={true}
            onNodeClick={(node) => {
              if (node.type === "case") {
                const id = node.id.replace("case:", "");
                nav(`/app/cases/${id}`);
              }
              // camera fly-to
              const distance = 60;
              const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
              fgRef.current?.cameraPosition({ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, node, 1500);
            }}
          />
        )}
        <div className="absolute bottom-3 left-3 glass p-3 text-xs space-y-1.5">
          <div className="label-eyebrow">Legend</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" /> FIR / Case</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Critical FIR</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Person / Accused</div>
          <div className="text-slate-500 mt-1">Click a node to fly-to / open case</div>
        </div>
      </div>
    </div>
  );
}

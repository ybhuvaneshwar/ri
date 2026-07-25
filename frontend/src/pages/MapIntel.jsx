import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline, Tooltip } from "react-leaflet";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      const bounds = points.map(p => [p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

const SEV_COLOR = { Critical: "#EF4444", High: "#F97316", Medium: "#F59E0B", Low: "#94A3B8" };

/** 3D-tilt pseudo-extrusion: for each district we render a vertical "bar" from lat/lng
 * upward by an offset proportional to case count. This gives a 3D bar-chart-on-map feel
 * without heavy deck.gl deps. Combined with `.tilt-map` CSS transform on the container. */
function DistrictBars({ points }) {
  const map = useMap();
  const bars = useMemo(() => {
    const byDistrict = {};
    points.forEach(p => {
      if (!byDistrict[p.district]) byDistrict[p.district] = { lat: p.lat, lng: p.lng, count: 0, critical: 0 };
      byDistrict[p.district].count++;
      if (p.severity === "Critical") byDistrict[p.district].critical++;
    });
    return Object.entries(byDistrict).map(([d, v]) => ({ district: d, ...v }));
  }, [points]);

  useEffect(() => {
    // Trigger re-render on zoom for accurate offset
    const handler = () => map.invalidateSize();
    map.on("zoomend", handler);
    return () => map.off("zoomend", handler);
  }, [map]);

  return (
    <>
      {bars.map(b => {
        const height = Math.min(2.5, 0.15 + b.count * 0.04); // deg offset upward
        const top = [b.lat + height, b.lng];
        const bottom = [b.lat, b.lng];
        const color = b.critical > 0 ? "#EF4444" : "#00E5FF";
        return (
          <React.Fragment key={b.district}>
            <Polyline positions={[bottom, top]} pathOptions={{ color, weight: 6, opacity: 0.85 }} />
            <CircleMarker center={top} radius={7 + Math.min(15, b.count/2)}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}>
              <Tooltip permanent direction="top" offset={[0,-8]} className="!bg-transparent !border-0 !shadow-none">
                <span className="text-[10px] font-mono text-white bg-[#040914]/80 px-1.5 py-0.5 rounded border border-white/10">{b.district}: {b.count}</span>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{b.district}</div>
                  <div className="text-xs">Cases: <b>{b.count}</b> · Critical: <b className="text-red-500">{b.critical}</b></div>
                </div>
              </Popup>
            </CircleMarker>
            <CircleMarker center={bottom} radius={4} pathOptions={{ color, fillColor: color, fillOpacity: 0.4, weight: 1 }} />
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function MapIntel() {
  const [points, setPoints] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [layer, setLayer] = useState("cases");
  const [tilt, setTilt] = useState(false);

  useEffect(() => {
    api.get("/map/hotspots").then(({data}) => setPoints(data));
    api.get("/predictions/hotspots").then(({data}) => setPredictions(data));
  }, []);

  return (
    <div className="space-y-4" data-testid="map-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="label-eyebrow text-[#00E5FF]">Map Intelligence</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Geospatial hotspots · Karnataka</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setLayer("cases")} className={layer==="cases" ? "btn-primary" : "btn-secondary"} data-testid="layer-cases">Case density</button>
          <button onClick={()=>setLayer("predictions")} className={layer==="predictions" ? "btn-primary" : "btn-secondary"} data-testid="layer-predictions">Predicted hotspots</button>
          <button onClick={()=>setLayer("bars3d")} className={layer==="bars3d" ? "btn-primary" : "btn-secondary"} data-testid="layer-bars3d">3D extrusion</button>
          <button onClick={()=>setTilt(t=>!t)} className={tilt ? "btn-primary" : "btn-secondary"} data-testid="tilt-toggle">Tilt {tilt?"off":"on"}</button>
        </div>
      </div>

      <div className="glass overflow-hidden" style={{height: "calc(100vh - 220px)"}}>
        <div style={{
          height: "100%", width: "100%",
          transform: tilt ? "perspective(1400px) rotateX(45deg) scale(0.95)" : "none",
          transformOrigin: "center 65%",
          transition: "transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}>
          <MapContainer center={[14.5, 75.7]} zoom={7} style={{height:"100%", width:"100%"}} scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {layer==="cases" && <FitBounds points={points} />}
            {layer==="cases" && points.map(p => (
              <CircleMarker key={p.id} center={[p.lat, p.lng]}
                radius={p.severity==="Critical" ? 10 : p.severity==="High" ? 8 : 6}
                pathOptions={{ color: SEV_COLOR[p.severity] || "#00E5FF", weight: 1, fillOpacity: 0.6, fillColor: SEV_COLOR[p.severity] || "#00E5FF" }}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-mono text-[#00E5FF]">{p.fir_no}</div>
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs opacity-70">{p.district} · {p.crime_head}</div>
                    <Link to={`/app/cases/${p.id}`} className="text-[#00E5FF] text-xs">Open case →</Link>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {layer==="predictions" && predictions.map(p => (
              <CircleMarker key={p.district} center={[p.lat, p.lng]}
                radius={12 + Math.min(30, p.recent_30d)}
                pathOptions={{ color: p.risk==="High"?"#EF4444":p.risk==="Medium"?"#F59E0B":"#10B981", weight: 2, fillOpacity: 0.25, fillColor: p.risk==="High"?"#EF4444":p.risk==="Medium"?"#F59E0B":"#10B981" }}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{p.district}</div>
                    <div className="text-xs">Risk: <b>{p.risk}</b> · Confidence: {p.confidence}%</div>
                    <div className="text-xs mt-1">{p.reason}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {layer==="bars3d" && <DistrictBars points={points} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

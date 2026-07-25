import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import DeckHexView from "@/components/DeckHexView";

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

export default function MapIntel() {
  const [points, setPoints] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [layer, setLayer] = useState("cases");

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
          <button onClick={()=>setLayer("hex3d")} className={layer==="hex3d" ? "btn-primary" : "btn-secondary"} data-testid="layer-hex3d">3D Hexagons (deck.gl)</button>
        </div>
      </div>

      <div className="glass overflow-hidden" style={{height: "calc(100vh - 220px)"}}>
        {layer === "hex3d" ? (
          <DeckHexView points={points} />
        ) : (
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
          </MapContainer>
        )}
      </div>
    </div>
  );
}

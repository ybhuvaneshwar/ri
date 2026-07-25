import React, { useMemo, useState } from "react";
import DeckGL from "@deck.gl/react";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";

// Cyan → orange → crimson (matches Kavacha palette)
const COLOR_RANGE = [
  [0, 229, 255],   // cyan (low)
  [16, 185, 129],  // emerald
  [245, 158, 11],  // amber
  [249, 115, 22],  // orange
  [239, 68, 68],   // red
  [190, 24, 93],   // crimson (high)
];

const INITIAL_VIEW_STATE = {
  longitude: 76.0,
  latitude: 14.8,
  zoom: 6.4,
  pitch: 52,
  bearing: 12,
  maxPitch: 65,
  minZoom: 4,
  maxZoom: 15,
};

/** True deck.gl 3D HexagonLayer with OSM basemap. Renders extruded hexagons whose
 * height and color scale with case density per bin. */
export default function DeckHexView({ points }) {
  const [radius, setRadius] = useState(6000);
  const [elevationScale, setElevationScale] = useState(220);
  const [hover, setHover] = useState(null);

  const layers = useMemo(() => ([
    new TileLayer({
      id: "osm-basemap",
      data: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
      minZoom: 0, maxZoom: 19, tileSize: 256,
      renderSubLayers: (props) => {
        const { boundingBox } = props.tile;
        return new BitmapLayer(props, {
          data: null,
          image: props.data,
          bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]],
          desaturate: 0.8,
          tintColor: [80, 100, 140],
        });
      },
    }),
    new HexagonLayer({
      id: "case-hexagons",
      data: points || [],
      getPosition: d => [d.lng, d.lat],
      radius,
      elevationScale,
      extruded: true,
      pickable: true,
      elevationRange: [0, 3000],
      colorRange: COLOR_RANGE,
      coverage: 0.85,
      material: { ambient: 0.6, diffuse: 0.7, shininess: 32, specularColor: [255, 255, 255] },
      onHover: info => setHover(info?.object ? info : null),
      updateTriggers: { radius, elevationScale },
    }),
  ]), [points, radius, elevationScale]);

  return (
    <div className="relative w-full h-full" data-testid="deck-hex-view">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={{ position: "absolute", inset: 0 }}
      />
      {/* Controls */}
      <div className="absolute top-3 left-3 glass p-3 space-y-3 text-xs w-56 z-10 pointer-events-auto">
        <div>
          <div className="label-eyebrow mb-1">Hex radius · {(radius/1000).toFixed(1)} km</div>
          <input type="range" min={2000} max={20000} step={500} value={radius}
            onChange={e => setRadius(+e.target.value)} className="w-full accent-[#00E5FF]"
            data-testid="deck-radius"/>
        </div>
        <div>
          <div className="label-eyebrow mb-1">Elevation × {elevationScale}</div>
          <input type="range" min={50} max={600} step={10} value={elevationScale}
            onChange={e => setElevationScale(+e.target.value)} className="w-full accent-[#00E5FF]"
            data-testid="deck-elevation"/>
        </div>
        <div className="text-[10px] text-slate-400 leading-relaxed">
          Drag to rotate · shift-drag to pitch · scroll to zoom.
        </div>
      </div>
      {/* Legend */}
      <div className="absolute bottom-3 right-3 glass p-3 text-xs z-10">
        <div className="label-eyebrow mb-2">Case density</div>
        <div className="flex items-center gap-1">
          {COLOR_RANGE.map((c, i) => (
            <div key={i} className="w-6 h-3" style={{background: `rgb(${c.join(",")})`}} />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-400"><span>Low</span><span>High</span></div>
      </div>
      {/* Hover tooltip */}
      {hover && hover.object && (
        <div className="absolute pointer-events-none glass px-3 py-2 text-xs z-20"
             style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <div className="font-mono text-[#00E5FF]">Hex bin</div>
          <div>Cases: <span className="font-semibold">{hover.object.points?.length ?? 0}</span></div>
          <div className="text-slate-400">Elevation ∝ density</div>
        </div>
      )}
    </div>
  );
}

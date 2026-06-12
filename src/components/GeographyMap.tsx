import React, { useState, useMemo } from 'react';
import { Globe, ZoomIn, ZoomOut, Info, MapPin } from 'lucide-react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { geoCentroid } from 'd3-geo';
import { motion } from 'motion/react';

interface GeographyMapProps {
  data: Record<string, any>[];
  filteredData: Record<string, any>[];
  selectedCategories?: string[];
  xAxisKey?: string;
  valueKey?: string;
  title: string;
  onDrillDown?: (key: string, val: string) => void;
}

const geoUrlWorld = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const geoUrlUs = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export const GeographyMap: React.FC<GeographyMapProps> = ({ data, filteredData, selectedCategories, xAxisKey, valueKey, title, onDrillDown }) => {
  const [mapType, setMapType] = useState<'us' | 'world'>('world');
  const [hoveredItem, setHoveredItem] = useState<{ name: string; val: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);

  const geoAnalysis = useMemo(() => {
    let bestKey = xAxisKey || '';
    let bestValKey = valueKey || '';

    if (!bestKey && data && data.length > 0) {
      const keys = Object.keys(data[0]);
      bestKey = keys.find(k => ['state', 'nation', 'country', 'region', 'iso'].includes(k.toLowerCase())) || keys[0] || 'id';
      bestValKey = keys.find(k => k !== bestKey && typeof data[0][k] === 'number') || keys[1] || 'value';
    }

    if (!bestKey) bestKey = 'state';
    if (!bestValKey) bestValKey = 'value';

    let maxValue = 0;
    const mappedValues: Record<string, number> = {};
    let usCount = 0;

    data.forEach(item => {
      const k = String(item[bestKey] || '').toUpperCase().trim();
      const v = Number(item[bestValKey] || 0);
      mappedValues[k] = (mappedValues[k] || 0) + v;
      if (mappedValues[k] > maxValue) maxValue = mappedValues[k];
      
      if (['TX','CA','NY','FL','AL','WA','OH','IL','MA'].includes(k)) usCount++;
    });

    const autoType: 'us' | 'world' = usCount >= data.length * 0.2 && data.length > 0 ? 'us' : 'world';

    return { bestKey, bestValKey, mappedValues, maxValue, autoType };
  }, [data, xAxisKey, valueKey]);

  React.useEffect(() => {
    setMapType(geoAnalysis.autoType);
    if (geoAnalysis.autoType === 'world') {
      setCenter([0, 20]);
    } else {
      setCenter([-96, 36]);
    }
    setZoom(1);
  }, [geoAnalysis.autoType]);

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, geoAnalysis.maxValue || 1])
      .range(["#eef2ff", "#4f46e5"]); // indigo-50 to indigo-600
  }, [geoAnalysis.maxValue]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1));

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950 p-2 relative rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-zinc-900 absolute">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2 mb-2 p-1 gap-2 relative z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate pr-2">
            {title} ({geoAnalysis.bestValKey})
          </span>
        </div>

          <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-50 dark:bg-zinc-900 p-0.5 rounded border border-slate-200 dark:border-zinc-800">
             <button title="Layer: Default" className="p-1.5 rounded text-indigo-600 bg-white dark:bg-zinc-800 shadow-sm"><Globe className="h-3 w-3" /></button>
             <button title="Layer: Terrain" className="p-1.5 rounded text-slate-500 hover:text-slate-800"><Info className="h-3 w-3" /></button>
             <button title="Layer: Satellite" className="p-1.5 rounded text-slate-500 hover:text-slate-800"><MapPin className="h-3 w-3" /></button>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800"></div>
          <div className="flex gap-1 border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-900 p-0.5">
             <button onClick={handleZoomOut} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 rounded"><ZoomOut className="h-3 w-3" /></button>
             <button onClick={handleZoomIn} className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 rounded"><ZoomIn className="h-3 w-3" /></button>
          </div>
          <div className="flex bg-slate-50 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-100 dark:border-zinc-800">
            <button
              onClick={() => { setMapType('us'); setCenter([-96, 36]); setZoom(1); }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                mapType === 'us'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
              }`}
            >
              US
            </button>
            <button
              onClick={() => { setMapType('world'); setCenter([0, 20]); setZoom(1); }}
              className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                mapType === 'world'
                  ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
              }`}
            >
              World
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl relative overflow-hidden group">
        {hoveredItem && (
          <div className="absolute top-2 left-2 z-10 bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-800 p-2 rounded shadow-lg pointer-events-none backdrop-blur-sm">
            <p className="font-bold text-xs text-slate-800 dark:text-zinc-200">{hoveredItem.name}</p>
            <p className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
              {geoAnalysis.bestValKey}: {hoveredItem.val.toLocaleString()}
            </p>
          </div>
        )}

        {/* Map Control Tools (Zoom & Pan) */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm shadow-slate-200/50 dark:shadow-none">
          <button 
            onClick={() => setZoom(z => Math.min(z * 1.5, 8))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="w-full h-px bg-slate-100 dark:bg-zinc-800"></div>
          <button 
            onClick={() => setZoom(z => Math.max(z / 1.5, 1))}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="w-full h-px bg-slate-100 dark:bg-zinc-800"></div>
          <button 
            onClick={() => {
              setZoom(1);
              setCenter(mapType === 'world' ? [0, 20] : [-96, 36]);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors font-mono text-[9px] font-bold tracking-widest uppercase cursor-pointer"
            title="Reset Map"
          >
            REF
          </button>
        </div>

        <ComposableMap
          projection={mapType === "us" ? "geoAlbersUsa" : "geoMercator"}
          projectionConfig={mapType === "world" ? { scale: 120 } : undefined}
          className="w-full h-full outline-none"
        >
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ coordinates, zoom }) => {
            setCenter(coordinates as [number, number]);
            setZoom(zoom);
          }}>
            <Geographies geography={mapType === 'us' ? geoUrlUs : geoUrlWorld}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const placeName = geo.properties.name;
                  
                  // Clean name formatting to match abbreviations if needed
                  const geoName = geo.properties.name?.toUpperCase() || "";
                  const rsmKeyName = (geo as any).rsmKey?.toUpperCase() || ""; // Sometimes useful
                   const valueMatch = Object.keys(geoAnalysis.mappedValues).find(
                     k => {
                        const uk = k.toUpperCase();
                        if (geoName === uk) return true;
                        if (geo.id?.toUpperCase() === uk) return true;
                        if (geo.properties.iso_a3?.toUpperCase() === uk) return true;
                        if (geo.properties.iso_a2?.toUpperCase() === uk) return true;
                        
                        // Common fuzzy matches:
                        if (geoName === "UNITED STATES OF AMERICA" && (uk === "UNITED STATES" || uk === "USA" || uk === "US")) return true;
                        if (geoName === "UNITED KINGDOM" && (uk === "UK" || uk === "GREAT BRITAIN")) return true;
                        if (geoName === "CHINA" && uk === "PRC") return true;
                        if (geoName === "UNITED ARAB EMIRATES" && uk === "UAE") return true;
                        if (geoName === "SOUTH KOREA" && (uk === "KOREA" || uk === "REPUBLIC OF KOREA")) return true;
                        if (geoName === "RUSSIAN FEDERATION" && uk === "RUSSIA") return true;
                        if (geoName === "CONGO, DEMOCRATIC REPUBLIC OF THE" && (uk === "DRC" || uk === "DR CONGO")) return true;
                        // Substring matches for longer names
                        if (uk.length > 4 && geoName.includes(uk)) return true;
                        if (uk.length > 4 && uk.includes(geoName)) return true;

                        return false;
                     }
                  );

                  const val = valueMatch ? geoAnalysis.mappedValues[valueMatch] : 0;
                  const normalizedSelected = selectedCategories?.map(c => c.toUpperCase()) || [];
                  const isSelected = normalizedSelected.includes((valueMatch || placeName || '').toUpperCase());
                  const hasSelection = normalizedSelected.length > 0;
                  const fillColor = hasSelection
                    ? (isSelected ? '#ef4444' : '#e2e8f0') 
                    : (val > 0 ? colorScale(val) : "#f8fafc");

                  return (
                    <motion.path
                      key={geo.rsmKey}
                      d={geo.svgPath}
                      fill={fillColor}
                      initial={false}
                      animate={{ fill: fillColor }}
                      transition={{ duration: 0.5 }}
                      onMouseEnter={() => {
                        setHoveredItem({ name: placeName || (valueMatch || ''), val });
                      }}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => {
                         if (onDrillDown && valueMatch) {
                           onDrillDown(geoAnalysis.bestKey, valueMatch);
                           const centroid = geoCentroid(geo as any);
                           setCenter(centroid);
                           setZoom(4);
                         } else if (onDrillDown && placeName) {
                           onDrillDown(geoAnalysis.bestKey, placeName);
                           const centroid = geoCentroid(geo as any);
                           setCenter(centroid);
                           setZoom(4);
                         }
                      }}
                      style={{ outline: "none", cursor: 'pointer', stroke: "#e2e8f0", strokeWidth: 0.5 }}
                      whileHover={{ stroke: "#fff", strokeWidth: 1, fill: isSelected ? "#ef4444" : "#f43f5e" }}
                    />
                  );
                })
              }
            </Geographies>

            {data.filter(d => d.latitude && d.longitude).map((d, i) => (
              <Marker key={i} coordinates={[d.longitude, d.latitude]}>
                <circle r={4} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-zinc-900/95 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm pointer-events-none">
          <p className="text-[9px] font-bold text-slate-500 mb-1">Range</p>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 rounded bg-gradient-to-r from-indigo-50 to-indigo-600"></div>
            <div className="flex flex-col text-[9px] text-slate-500">
              <span>{geoAnalysis.maxValue.toLocaleString()}</span>
              <span>0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

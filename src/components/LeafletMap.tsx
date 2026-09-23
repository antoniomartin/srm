/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, MapPin, Loader2, Navigation, Maximize2, RotateCcw, Building2, Truck } from 'lucide-react';
import { Empresa } from '../types';

interface LeafletMapProps {
  empresas: Empresa[];
  onOpenFicha: (empId: string) => void;
  selectedTipo: string;
  selectedEstado: string;
  scores: { [id: string]: { nivel: string; label: string; dias: number | null } };
}

// In-memory cache for address geocoding
const geoCache: { [addr: string]: { lat: number; lon: number } } = {};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  empresas,
  onOpenFicha,
  selectedTipo,
  selectedEstado,
  scores,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [geocodedCount, setGeocodedCount] = useState(0);

  // 1. Dynamically Load Leaflet Assets
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 2. Fetch Lat/Lon from Address via Nominatim
  const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    if (geoCache[query]) return geoCache[query];
    try {
      await new Promise((r) => setTimeout(r, 1100));
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const resp = await fetch(url, {
        headers: { 'Accept-Language': 'es', 'User-Agent': 'SRM-Profesional-React/1.0' },
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        geoCache[query] = coords;
        return coords;
      }
    } catch (e) {
      console.error('Geocoding failed', e);
    }
    return null;
  };

  const getCompanyFullAddress = (emp: Empresa) => {
    return [emp.direccion, emp.ciudad, emp.provincia, emp.pais].filter(Boolean).join(', ');
  };

  const resetMapView = useCallback(() => {
    if (!mapRef.current) return;
    if (markersRef.current.length > 0) {
      const L = (window as any).L;
      if (L) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.fitBounds(group.getBounds().pad(0.15));
        return;
      }
    }
    mapRef.current.setView([40.416775, -3.70379], 6);
  }, []);

  // 3. Initialize Map and Plot Markers
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Create map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
      }).setView([40.416775, -3.70379], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Filter companies
    const filtered = empresas.filter((e) => {
      const matchesTipo = selectedTipo === 'todos' || e.tipo === selectedTipo;
      const matchesEstado = selectedEstado === 'todos' || e.estado === selectedEstado;
      return matchesTipo && matchesEstado;
    });

    const getMarkerTheme = (emp: Empresa) => {
      let bg = '#4f46e5'; // indigo
      let ring = '#e0e7ff';
      let iconText = '🏢';

      if (emp.tipo === 'fabricante') {
        bg = '#2563eb'; // blue
        ring = '#bfdbfe';
        iconText = '🏭';
      } else if (emp.tipo === 'distribuidor') {
        bg = '#d97706'; // amber
        ring = '#fde68a';
        iconText = '🚚';
      } else if (emp.tipo === 'servicios') {
        bg = '#0d9488'; // teal
        ring = '#99f6e4';
        iconText = '🛠️';
      }

      // Border indicator according to status
      let borderColor = '#ffffff';
      if (emp.estado === 'homologado' || emp.estado === 'validado') {
        borderColor = '#10b981'; // emerald
      } else if (emp.estado === 'en_cuarentena') {
        borderColor = '#f59e0b'; // amber
      } else if (emp.estado === 'no_apto') {
        borderColor = '#ef4444'; // rose
      } else if (emp.estado === 'inactivo') {
        borderColor = '#94a3b8'; // slate
      }

      return { bg, ring, iconText, borderColor };
    };

    const createMarkerIcon = (emp: Empresa) => {
      const theme = getMarkerTheme(emp);
      return L.divIcon({
        className: 'srm-custom-pin',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            background: ${theme.bg};
            border: 2.5px solid ${theme.borderColor};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease;
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 13px;
              line-height: 1;
              user-select: none;
            ">${theme.iconText}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
      });
    };

    let cancels = false;

    const plotMarkers = async () => {
      setIsLoading(true);
      let placedCount = 0;
      const missingAddresses: string[] = [];

      for (const emp of filtered) {
        if (cancels) return;

        let coords: { lat: number; lon: number } | null = null;

        if (emp._lat && emp._lon) {
          coords = { lat: emp._lat, lon: emp._lon };
        } else {
          const addr = getCompanyFullAddress(emp);
          if (addr) {
            setStatusMessage(`Localizando: ${emp.nombre}...`);
            coords = await geocodeAddress(addr);
          }
        }

        if (coords) {
          placedCount++;
          const score = scores[emp.id || ''] || { nivel: 'gris', label: 'Sin evaluar' };
          const fullAddr = getCompanyFullAddress(emp) || 'Dirección sin especificar';

          let scoreBadgeBg = '#f1f5f9';
          let scoreBadgeText = '#475569';
          if (score.nivel === 'verde') {
            scoreBadgeBg = '#ecfdf5';
            scoreBadgeText = '#047857';
          } else if (score.nivel === 'amarillo') {
            scoreBadgeBg = '#fffbeb';
            scoreBadgeText = '#b45309';
          } else if (score.nivel === 'rojo') {
            scoreBadgeBg = '#fff1f2';
            scoreBadgeText = '#be123c';
          }

          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 220px; max-width: 260px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.2;">
                  ${emp.nombre}
                </h4>
              </div>
              <p style="margin: 4px 0 8px 0; font-size: 11px; color: #64748b; line-height: 1.3;">
                📍 ${fullAddr}
              </p>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
                <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background: #f8fafc; color: #334155; border: 1px solid #e2e8f0;">
                  ${emp.tipo === 'fabricante' ? '🏭 Fabricante' : emp.tipo === 'distribuidor' ? '🚚 Distribuidor' : '🛠️ Servicios'}
                </span>
                <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${scoreBadgeBg}; color: ${scoreBadgeText};">
                  ⭐ ${score.label}
                </span>
              </div>
              <button 
                id="marker-btn-${emp.id}"
                style="
                  width: 100%;
                  background: #4f46e5;
                  color: #ffffff;
                  border: none;
                  border-radius: 8px;
                  padding: 7px 12px;
                  font-size: 11px;
                  font-weight: 700;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
                "
              >
                Abrir Ficha de Proveedor →
              </button>
            </div>
          `;

          const marker = L.marker([coords.lat, coords.lon], { icon: createMarkerIcon(emp) })
            .bindPopup(popupContent, { maxWidth: 280 })
            .addTo(map);

          marker.on('popupopen', () => {
            const btn = document.getElementById(`marker-btn-${emp.id}`);
            if (btn) {
              btn.addEventListener('click', (e) => {
                e.preventDefault();
                onOpenFicha(emp.id!);
              });
            }
          });

          markersRef.current.push(marker);
        } else if (getCompanyFullAddress(emp)) {
          missingAddresses.push(emp.nombre);
        }
      }

      setIsLoading(false);
      setGeocodedCount(placedCount);
      setStatusMessage(
        `${placedCount} proveedor(es) localizados en el mapa.` +
          (missingAddresses.length > 0 ? ` Pendientes de ubicar: ${missingAddresses.slice(0, 3).join(', ')}${missingAddresses.length > 3 ? '...' : ''}` : '')
      );

      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    };

    plotMarkers();

    return () => {
      cancels = true;
    };
  }, [isLeafletLoaded, empresas, selectedTipo, selectedEstado, scores, onOpenFicha]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col transition-all">
      {/* Map Header Controls */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <span>Red Logística y Ubicación de Proveedores</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {geocodedCount} visibles
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Explora visualmente los almacenes, fábricas y oficinas de tus proveedores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Geocodificando...
            </span>
          )}
          <button
            type="button"
            onClick={resetMapView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Centrar vista del mapa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Centrar Mapa</span>
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full min-h-[480px] sm:min-h-[560px] h-[58vh] z-0 border-b border-slate-100 bg-slate-100"
      />

      {/* Map Footer Legend & Status */}
      <div className="p-3 sm:px-4 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-medium">
        <p className="truncate text-slate-600">{statusMessage || 'Cargando mapa interactivo...'}</p>
        <div className="flex items-center gap-4 text-[11px] font-bold shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white shadow-2xs"></span> 🏭 Fabricante
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 border border-white shadow-2xs"></span> 🚚 Distribuidor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-2xs"></span> ✓ Homologado
          </span>
        </div>
      </div>
    </div>
  );
};

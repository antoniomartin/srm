/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Map, MapPin, Loader2, Navigation } from 'lucide-react';
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

  // 1. Dynamically Load Leaflet Assets
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    // Load stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Keep Leaflet globals loaded to prevent flicker, but cleanup containers
    };
  }, []);

  // 2. Fetch Lat/Lon from Address via Nominatim
  const geocodeAddress = async (query: string): Promise<{ lat: number; lon: number } | null> => {
    if (geoCache[query]) return geoCache[query];
    try {
      // Rate-limiting pause to respect Nominatim limits
      await new Promise(r => setTimeout(r, 1100));
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const resp = await fetch(url, {
        headers: { 'Accept-Language': 'es', 'User-Agent': 'SRM-Profesional-React/1.0' }
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data && data[0]) {
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        geoCache[query] = coords;
        return coords;
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
    return null;
  };

  const getCompanyFullAddress = (emp: Empresa) => {
    return [emp.direccion, emp.ciudad, emp.provincia, emp.pais].filter(Boolean).join(', ');
  };

  // 3. Initialize Map and Plot Markers
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Create map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([40.416775, -3.703790], 5); // Center on Spain by default
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Filter companies
    const filtered = empresas.filter(e => {
      const matchesTipo = selectedTipo === 'todos' || e.tipo === selectedTipo;
      const matchesEstado = selectedEstado === 'todos' || e.estado === selectedEstado;
      return matchesTipo && matchesEstado;
    });

    // Helper to get marker colors
    const getMarkerColor = (emp: Empresa) => {
      switch (emp.tipo) {
        case 'fabricante': return '#3b82f6'; // blue
        case 'distribuidor': return '#f59e0b'; // amber
        case 'servicios': return '#14b8a6'; // teal
        default: return '#64748b'; // slate
      }
    };

    // Helper to render customized HTML dot markers
    const createMarkerIcon = (emp: Empresa) => {
      const color = getMarkerColor(emp);
      return L.divIcon({
        className: '',
        html: `<div style="width:16px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
    };

    let cancels = false;

    const plotMarkers = async () => {
      setIsLoading(true);
      let placedCount = 0;
      let missingAddresses: string[] = [];

      for (const emp of filtered) {
        if (cancels) return;

        let coords: { lat: number; lon: number } | null = null;

        // Use pre-saved coords if they exist
        if (emp._lat && emp._lon) {
          coords = { lat: emp._lat, lon: emp._lon };
        } else {
          // Otherwise search
          const addr = getCompanyFullAddress(emp);
          if (addr) {
            setStatusMessage(`Localizando: ${emp.nombre}...`);
            coords = await geocodeAddress(addr);
          }
        }

        if (coords) {
          placedCount++;
          const score = scores[emp.id || ''] || { nivel: 'gris', label: 'Sin datos' };
          const popupContent = `
            <div class="p-1 font-sans">
              <h4 class="font-bold text-slate-800 text-sm flex items-center gap-1.5">${emp.nombre}</h4>
              <p class="text-xs text-slate-500 mt-1">${getCompanyFullAddress(emp)}</p>
              <div class="mt-2 text-xs flex gap-1">
                <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">${emp.tipo}</span>
                <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">${score.label}</span>
              </div>
              <button 
                id="marker-btn-${emp.id}"
                class="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                Abrir Ficha →
              </button>
            </div>
          `;

          const marker = L.marker([coords.lat, coords.lon], { icon: createMarkerIcon(emp) })
            .bindPopup(popupContent, { maxWidth: 220 })
            .addTo(map);

          // Handle button clicks in Leaflet Popups dynamically
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
      setStatusMessage(
        `${placedCount} empresa(s) localizadas en el mapa.` +
        (missingAddresses.length > 0 ? ` Sin localizar: ${missingAddresses.join(', ')}` : '')
      );

      // Auto-fit bounds if we have markers
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    };

    plotMarkers();

    return () => {
      cancels = true;
    };
  }, [isLeafletLoaded, empresas, selectedTipo, selectedEstado, scores]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-500" />
            <span>Mapa de Distribución</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Representación de proveedores geolocalizados por su dirección</p>
        </div>

        <div className="flex gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando direcciones...
            </span>
          )}
        </div>
      </div>

      <div 
        ref={mapContainerRef} 
        className="h-[420px] w-full z-0 border-b border-slate-100"
      />

      <div className="p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <p className="font-medium">{statusMessage || 'Cargando mapa...'}</p>
        <div className="flex gap-3 font-semibold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white shadow-sm"></span> Fabricantes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-sm"></span> Distribuidores
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 border border-white shadow-sm"></span> Servicios
          </span>
        </div>
      </div>
    </div>
  );
};

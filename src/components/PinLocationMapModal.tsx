/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, X, Check, Search, Navigation } from 'lucide-react';
import { Empresa } from '../types';

interface PinLocationMapModalProps {
  empresa: Empresa;
  onConfirm: (lat: number, lon: number) => void;
  onCancel: () => void;
}

export const PinLocationMapModal: React.FC<PinLocationMapModalProps> = ({
  empresa,
  onConfirm,
  onCancel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const initTimeoutRef = useRef<any>(null);
  const invalidateTimeoutRef = useRef<any>(null);

  // 1. Dynamically Load Leaflet Assets
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    // Check if stylesheet is already in document
    const existingLink = document.querySelector('link[href*="leaflet.css"]');
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // 2. Initialize Map once Leaflet is loaded
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Helper to get full address string for initial lookup
    const getFullAddress = () => {
      return [empresa.direccion, empresa.ciudad, empresa.provincia, empresa.pais].filter(Boolean).join(', ');
    };

    const initializeMap = async () => {
      let initialLat = 40.416775; // Madrid
      let initialLon = -3.703790;
      let initialZoom = 5;
      let hasCustomLocation = false;

      // Case A: Company already has coordinates
      if (empresa._lat && empresa._lon) {
        initialLat = empresa._lat;
        initialLon = empresa._lon;
        initialZoom = 15;
        hasCustomLocation = true;
      } else {
        // Case B: No coordinates, let's try to geocode its address
        const addr = getFullAddress();
        if (addr) {
          try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
            const resp = await fetch(url, {
              headers: { 'Accept-Language': 'es', 'User-Agent': 'SRM-ManualPin/1.0' }
            });
            if (resp.ok) {
              const data = await resp.json();
              if (data && data[0]) {
                initialLat = parseFloat(data[0].lat);
                initialLon = parseFloat(data[0].lon);
                initialZoom = 15;
                hasCustomLocation = true;
              }
            }
          } catch (e) {
            console.error("Autogeocoding failed for manual pin modal", e);
          }
        }
      }

      setCurrentCoords({ lat: initialLat, lon: initialLon });

      // Create Leaflet Map instance after a slight timeout so the DOM element has finished layout and has computed height
      initTimeoutRef.current = setTimeout(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return; // Prevent double creation

        mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLon], initialZoom);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);

        // Define a nice icon style
        const customIcon = L.divIcon({
          html: `<div class="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500 text-white shadow-lg border-2 border-white transform -translate-y-1/2">
                   <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                     <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                 </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });

        // Add Draggable Marker
        markerRef.current = L.marker([initialLat, initialLon], {
          icon: customIcon,
          draggable: true
        }).addTo(mapRef.current);

        // Listen for drag end event
        markerRef.current.on('dragend', () => {
          const latLng = markerRef.current.getLatLng();
          setCurrentCoords({ lat: latLng.lat, lon: latLng.lng });
        });

        // Listen for map click to place/move marker directly
        mapRef.current.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          markerRef.current.setLatLng([lat, lng]);
          setCurrentCoords({ lat, lon: lng });
        });

        // Invalidate map size once more shortly after to ensure rendering is seamless
        invalidateTimeoutRef.current = setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 150);
      }, 150);
    };

    initializeMap();

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      if (invalidateTimeoutRef.current) clearTimeout(invalidateTimeoutRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isLeafletLoaded, empresa]);

  // Handle Search Input Geocoding
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current || !markerRef.current) return;

    setIsSearching(true);
    setSearchError('');
    const L = (window as any).L;

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`;
      const resp = await fetch(url, {
        headers: { 'Accept-Language': 'es', 'User-Agent': 'SRM-ManualPin/1.0' }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          
          // Update map and marker positions
          mapRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
          setCurrentCoords({ lat, lon });
        } else {
          setSearchError('No se encontraron resultados para la dirección especificada.');
        }
      } else {
        setSearchError('Error al conectar con el servicio de mapas.');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Ocurrió un error al buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Georreferenciar Proveedor</h3>
              <p className="text-xs text-slate-400">
                Arrastra el marcador rojo al punto exacto, haz clic en el mapa o busca una dirección
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar in Modal */}
        <div className="p-3 bg-slate-50 border-b border-slate-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar una calle, ciudad, código postal o lugar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>Buscar</span>
            </button>
          </form>
          {searchError && (
            <p className="text-[11px] text-rose-500 mt-1.5 font-medium ml-1">⚠️ {searchError}</p>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 bg-slate-100 min-h-[380px] h-[380px]">
          {!isLeafletLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 z-10 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-semibold">Cargando mapa interactivo...</span>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-[380px] z-0" />
        </div>

        {/* Bottom Coordinates Display and Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Coordenadas:</span>
            {currentCoords ? (
              <span className="text-xs bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg text-indigo-700 font-mono font-bold shadow-sm">
                Lat: {currentCoords.lat.toFixed(6)}, Lon: {currentCoords.lon.toFixed(6)}
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium italic">Obteniendo coordenadas...</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 justify-end">
            <button 
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (currentCoords) {
                  onConfirm(currentCoords.lat, currentCoords.lon);
                }
              }}
              disabled={!currentCoords}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl shadow-md shadow-indigo-900/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

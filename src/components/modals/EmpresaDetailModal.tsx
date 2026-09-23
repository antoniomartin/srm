/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Save, Trash2, Tag, Plus, File, MapPin, Check, Sparkles, AlertCircle, 
  Search, Phone, Mail, ExternalLink, Calendar, Upload, FileText, Clock, ShieldCheck
} from 'lucide-react';
import { 
  Empresa, Contacto, Interaccion, Documento, Relacion, EmpresaTipo, 
  UNSPSC_OPTIONS, UnspscCode 
} from '../../types';
import { OrganigramaTree } from './OrganigramaTree';

const PAISES = [
  "España", "Portugal", "Francia", "Alemania", "Italia", "Reino Unido", 
  "Estados Unidos", "México", "Colombia", "Argentina", "Perú", "Chile", 
  "Ecuador", "Venezuela", "Bélgica", "Países Bajos", "Suiza", "Austria", 
  "Suecia", "Noruega", "Dinamarca", "Finlandia", "Irlanda", "Polonia", 
  "Rumanía", "Grecia", "Turquía", "Marruecos", "Andorra", "Canadá", 
  "Brasil", "Uruguay", "Bolivia", "Paraguay", "Panamá", "Costa Rica", 
  "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Cuba", 
  "República Dominicana", "Puerto Rico", "China", "Japón", "Corea del Sur", 
  "India", "Australia", "Nueva Zelanda", "Sudáfrica"
];

interface RelacionAutocompleteProps {
  empresas: Empresa[];
  tipoEsperado: 'fabricante' | 'distribuidor';
  onSelectExisting: (id: string) => Promise<void>;
  onCreateAndSelect: (nombre: string) => Promise<void>;
  alreadyLinkedIds: string[];
  currentEmpresaId: string;
  placeholder: string;
}

const RelacionAutocomplete: React.FC<RelacionAutocompleteProps> = ({
  empresas,
  tipoEsperado,
  onSelectExisting,
  onCreateAndSelect,
  alreadyLinkedIds,
  currentEmpresaId,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = empresas.filter((e) => {
    const isOfTipo = e.tipo === tipoEsperado || (e.esTambien || []).includes(tipoEsperado);
    if (!isOfTipo) return false;
    if (e.id === currentEmpresaId) return false;
    if (alreadyLinkedIds.includes(e.id || '')) return false;
    if (!query.trim()) return true;

    const cleanQuery = query.toLowerCase().trim();
    return (
      e.nombre.toLowerCase().includes(cleanQuery) ||
      (e.nit && e.nit.toLowerCase().includes(cleanQuery)) ||
      (e.unspscCodes || []).some(
        (u) =>
          u.code.toLowerCase().includes(cleanQuery) ||
          u.name.toLowerCase().includes(cleanQuery) ||
          (u.segment && u.segment.toLowerCase().includes(cleanQuery))
      )
    );
  });

  const handleSelect = async (id: string) => {
    await onSelectExisting(id);
    setQuery('');
    setIsOpen(false);
  };

  const handleCreate = async (name: string) => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await onCreateAndSelect(name.trim());
      setQuery('');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const exactMatch = query.trim()
    ? empresas.some((e) => e.nombre.toLowerCase() === query.toLowerCase().trim())
    : false;

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1 text-slate-800">
          {filtered.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                Sugerencias ({filtered.length})
              </div>
              {filtered.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => handleSelect(emp.id!)}
                  className="px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-700">{emp.nombre}</p>
                    <p className="text-[10px] text-slate-400">
                      {emp.ciudad || 'Sin ciudad'} {emp.pais ? `· ${emp.pais}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150">
                    Vincular
                  </span>
                </div>
              ))}
            </div>
          ) : (
            query.trim() && (
              <div className="px-3 py-2 text-xs text-slate-400 italic">
                No hay empresas existentes que coincidan.
              </div>
            )
          )}

          {query.trim() && !exactMatch && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              <div
                onClick={() => handleCreate(query)}
                className="px-3 py-2.5 text-xs bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    Crear nueva empresa: <span className="font-bold underline">"{query.trim()}"</span>
                  </p>
                  <p className="text-[10px] text-indigo-500 font-normal">
                    Se creará como tipo "{tipoEsperado === 'distribuidor' ? '🚚 distribuidor' : '🏭 fabricante'}" y se vinculará automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface EmpresaDetailModalProps {
  selectedEmpresa: Empresa | null;
  onClose: () => void;
  empresas: Empresa[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  documentos: Documento[];
  relaciones: Relacion[];
  scores: { [id: string]: { nivel: string; label: string; dias: number | null } };
  onUpdateEmpresa: (emp: Empresa) => Promise<void>;
  onDeleteEmpresa: (id: string) => Promise<void>;
  onOpenContacto?: (id: string) => void;
  onOpenInteraccion?: (id: string) => void;
  onOpenEmpresa?: (id: string) => void;
  onAddRelacion: (fabId: string, distId: string, pref: 'si' | 'no') => Promise<void>;
  onAddEmpresaRapida: (nombre: string, tipo: EmpresaTipo) => Promise<string | undefined>;
  onUpdateRelacion: (rel: Relacion) => Promise<void>;
  onDeleteRelacion: (id: string) => Promise<void>;
  onAddDocumento: (empId: string, nombre: string, url: string, caducidad: string | null) => Promise<void>;
  onDeleteDocumento: (id: string) => Promise<void>;
  onGeocodeManual: (empId: string) => void;
  onGeneratePDF: (emp: Empresa) => void;
  onUpdateContacto: (cont: Contacto) => Promise<void>;
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  askConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDestructive?: boolean,
    confirmLabel?: string,
    cancelLabel?: string
  ) => void;
}

export const EmpresaDetailModal: React.FC<EmpresaDetailModalProps> = ({
  selectedEmpresa,
  onClose,
  empresas,
  contactos,
  interacciones,
  documentos,
  relaciones,
  scores,
  onUpdateEmpresa,
  onDeleteEmpresa,
  onOpenContacto,
  onOpenInteraccion,
  onOpenEmpresa,
  onAddRelacion,
  onAddEmpresaRapida,
  onUpdateRelacion,
  onDeleteRelacion,
  onAddDocumento,
  onDeleteDocumento,
  onGeocodeManual,
  onGeneratePDF,
  onUpdateContacto,
  onUpdateInteraccion,
  askConfirmation,
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');

  // Performance evaluation state
  const [evalPlazos, setEvalPlazos] = useState(0);
  const [evalCalidad, setEvalCalidad] = useState(0);
  const [evalFlexibilidad, setEvalFlexibilidad] = useState(0);
  const [evalComentarios, setEvalComentarios] = useState('');
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [evalSaveSuccess, setEvalSaveSuccess] = useState(false);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>('prospecto');

  // Country suggestions
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

  // Tags state
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // UNSPSC search and manual
  const [unspscSearch, setUnspscSearch] = useState('');
  const [unspscShowDropdown, setUnspscShowDropdown] = useState(false);
  const [showManualUnspsc, setShowManualUnspsc] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [dynamicUnspscOptions, setDynamicUnspscOptions] = useState<UnspscCode[]>([]);
  const [isSearchingUnspsc, setIsSearchingUnspsc] = useState(false);
  const unspscDropdownRef = useRef<HTMLDivElement>(null);

  // Document upload state
  const [showAddDocForm, setShowAddDocForm] = useState(false);
  const [docNombre, setDocNombre] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');
  const [docUrl, setDocUrl] = useState('');

  // Inline forms
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
    reportaA: '' as string | null,
    foto: '',
  });

  const [showAddInterFormEmp, setShowAddInterFormEmp] = useState(false);
  const [newInterFormEmp, setNewInterFormEmp] = useState({
    asunto: '',
    tipo: 'reunion' as 'reunion' | 'llamada' | 'email' | 'feria',
    fecha: new Date().toISOString().slice(0, 10),
    contactoId: '',
    descripcion: '',
    estado: 'pendiente' as 'pendiente' | 'completada',
  });

  useEffect(() => {
    if (selectedEmpresa) {
      setEvalPlazos(selectedEmpresa.evaluacion?.plazos || 0);
      setEvalCalidad(selectedEmpresa.evaluacion?.calidad || 0);
      setEvalFlexibilidad(selectedEmpresa.evaluacion?.flexibilidad || 0);
      setEvalComentarios(selectedEmpresa.evaluacion?.comentarios || '');
      setEvalSaveSuccess(false);
      setEstadoSeleccionado(selectedEmpresa.estado || 'prospecto');
      setAiResponse(null);
      setAiError('');
      setShowAddContactForm(false);
      setShowAddInterFormEmp(false);
      setShowAddDocForm(false);
    }
  }, [selectedEmpresa?.id, selectedEmpresa?.estado]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (unspscDropdownRef.current && !unspscDropdownRef.current.contains(event.target as Node)) {
        setUnspscShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!unspscSearch.trim()) {
      setDynamicUnspscOptions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingUnspsc(true);
      try {
        const response = await fetch('/api/unspsc/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: unspscSearch }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.codes)) {
            setDynamicUnspscOptions(data.codes);
          }
        }
      } catch (err) {
        console.error('Error searching UNSPSC:', err);
      } finally {
        setIsSearchingUnspsc(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [unspscSearch]);

  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    empresas.forEach((emp) => {
      if (emp.tags && Array.isArray(emp.tags)) {
        emp.tags.forEach((tag) => {
          if (tag && tag.trim()) tagsSet.add(tag.trim());
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [empresas]);

  const filteredUnspscOptions = useMemo(() => {
    if (!unspscSearch.trim()) return UNSPSC_OPTIONS.slice(0, 10);
    if (dynamicUnspscOptions.length > 0) return dynamicUnspscOptions;

    const searchLower = unspscSearch.toLowerCase();
    return UNSPSC_OPTIONS.filter(
      (item) => item.code.includes(searchLower) || item.name.toLowerCase().includes(searchLower)
    );
  }, [unspscSearch, dynamicUnspscOptions]);

  if (!selectedEmpresa) return null;

  const handleInlineSave = async (field: string, value: any) => {
    const updated = { ...selectedEmpresa, [field]: value };
    await onUpdateEmpresa(updated);
  };

  const handleAddTag = async (tag: string) => {
    if (!tag.trim() || selectedEmpresa.tags.includes(tag)) return;
    const updated = { ...selectedEmpresa, tags: [...selectedEmpresa.tags, tag] };
    await onUpdateEmpresa(updated);
  };

  const handleRemoveTag = async (tag: string) => {
    const updated = { ...selectedEmpresa, tags: selectedEmpresa.tags.filter((t) => t !== tag) };
    await onUpdateEmpresa(updated);
  };

  const generateAiInsights = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const conts = contactos.filter(
        (c) => c.empresaId === selectedEmpresa.id || c.empresaIds?.includes(selectedEmpresa.id!)
      );
      const cids = conts.map((c) => c.id);
      const history = interacciones
        .filter((i) => {
          const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
          return ids.some((cid) => cids.includes(cid));
        })
        .map((i) => ({
          date: i.fecha,
          type: i.tipo,
          title: i.asunto,
          desc: i.descripcion,
          res: i.resolucion,
        }));

      const resp = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'empresa',
          name: selectedEmpresa.nombre,
          details: selectedEmpresa,
          history,
        }),
      });

      if (!resp.ok) throw new Error('Error al conectar con el servicio de IA');
      const data = await resp.json();
      setAiResponse(data.insights);
    } catch (err) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  };

  const renderStars = (currentVal: number, setVal: (v: number) => void) => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setVal(star)}
          className="text-2xl transition-all hover:scale-125 focus:outline-none cursor-pointer"
          title={`Valorar ${star} de 5`}
        >
          {star <= currentVal ? (
            <span className="text-amber-400">★</span>
          ) : (
            <span className="text-slate-200 hover:text-amber-300">★</span>
          )}
        </button>
      ))}
      {currentVal > 0 && (
        <span className="text-xs font-bold text-slate-500 ml-1.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
          {currentVal}/5
        </span>
      )}
    </div>
  );

  const isFabricante =
    selectedEmpresa.tipo === 'fabricante' || (selectedEmpresa.esTambien || []).includes('fabricante');
  const isDistribuidor =
    selectedEmpresa.tipo === 'distribuidor' || (selectedEmpresa.esTambien || []).includes('distribuidor');

  const contactosEmpresa = contactos.filter(
    (c) => c.empresaId === selectedEmpresa.id || c.empresaIds?.includes(selectedEmpresa.id!)
  );

  const docsEmpresa = documentos.filter((d) => d.empresaId === selectedEmpresa.id);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
          <div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {[selectedEmpresa.tipo, ...(selectedEmpresa.esTambien || [])]
                .filter((val, index, self) => val && self.indexOf(val) === index)
                .map((role) => (
                  <span
                    key={role}
                    className="text-[10px] font-bold text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/20 uppercase tracking-wider"
                  >
                    {role === 'fabricante'
                      ? '🏭 fabricante'
                      : role === 'distribuidor'
                      ? '🚚 distribuidor'
                      : role === 'servicios'
                      ? '🛠️ servicios'
                      : '📦 ' + role}
                  </span>
                ))}
            </div>
            <h2 className="text-2xl font-bold mt-1 text-slate-50">{selectedEmpresa.nombre}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                  selectedEmpresa.estado === 'homologado' || selectedEmpresa.estado === 'validado'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : selectedEmpresa.estado === 'en_proceso'
                    ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    : selectedEmpresa.estado === 'en_cuarentena'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : selectedEmpresa.estado === 'no_apto'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : selectedEmpresa.estado === 'inactivo'
                    ? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}
              >
                {selectedEmpresa.estado === 'homologado' || selectedEmpresa.estado === 'validado'
                  ? 'Homologado'
                  : selectedEmpresa.estado === 'en_proceso'
                  ? 'En proceso'
                  : selectedEmpresa.estado === 'en_cuarentena'
                  ? 'En cuarentena'
                  : selectedEmpresa.estado === 'no_apto'
                  ? 'No apto'
                  : selectedEmpresa.estado === 'inactivo'
                  ? 'Inactivo'
                  : 'Prospecto'}
              </span>

              {selectedEmpresa.evaluacion &&
                selectedEmpresa.evaluacion.plazos > 0 &&
                selectedEmpresa.evaluacion.calidad > 0 &&
                selectedEmpresa.evaluacion.flexibilidad > 0 &&
                (() => {
                  const avg =
                    (selectedEmpresa.evaluacion.plazos +
                      selectedEmpresa.evaluacion.calidad +
                      selectedEmpresa.evaluacion.flexibilidad) /
                    3;
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        avg >= 4.0
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : avg >= 2.5
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                      title={`Última evaluación de desempeño: ${avg.toFixed(1)}/5.0`}
                    >
                      <span>⭐ KPI: {avg.toFixed(1)}/5</span>
                    </span>
                  );
                })()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Action Toolbar */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
            <button
              onClick={() => onGeneratePDF(selectedEmpresa)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <File className="w-4 h-4" /> Exportar PDF
            </button>
            <button
              onClick={() => onGeocodeManual(selectedEmpresa.id!)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4" /> Fijar ubicación
            </button>
            {selectedEmpresa._lat && selectedEmpresa._lon && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono font-medium">
                📍 {selectedEmpresa._lat.toFixed(5)}, {selectedEmpresa._lon.toFixed(5)}
              </span>
            )}
            <button
              onClick={generateAiInsights}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Análisis IA Copilot
            </button>
            <button
              onClick={() => {
                askConfirmation(
                  "¿Eliminar Proveedor?",
                  `¿Estás seguro de que deseas eliminar permanentemente a "${selectedEmpresa.nombre}"? Esta acción borrará el proveedor y no se podrá deshacer.`,
                  () => {
                    onDeleteEmpresa(selectedEmpresa.id!);
                    onClose();
                  }
                );
              }}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>

          {/* AI Insights Display */}
          {aiLoading && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl animate-pulse text-sm text-indigo-700 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-bounce" /> Generando informe de IA con Gemini...
            </div>
          )}
          {aiError && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {aiError}
            </div>
          )}
          {aiResponse && (
            <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 p-5 rounded-xl text-sm text-slate-700 relative shadow-sm">
              <button
                onClick={() => setAiResponse(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Resumen Ejecutivo e Insights de IA
              </h4>
              <div className="prose prose-indigo text-xs whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            </div>
          )}

          {/* Direct contact shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Teléfono central</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={selectedEmpresa.telefono || ''}
                  onChange={(e) => handleInlineSave('telefono', e.target.value)}
                  className="bg-transparent border-b border-dashed border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 w-full py-0.5"
                />
                {selectedEmpresa.telefono && (
                  <a
                    href={`tel:${selectedEmpresa.telefono}`}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Llamar"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Email comercial</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={selectedEmpresa.email || ''}
                  onChange={(e) => handleInlineSave('email', e.target.value)}
                  className="bg-transparent border-b border-dashed border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 w-full py-0.5"
                />
                {selectedEmpresa.email && (
                  <a
                    href={`mailto:${selectedEmpresa.email}`}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Escribir correo"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Sitio Web</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  value={selectedEmpresa.web || ''}
                  onChange={(e) => handleInlineSave('web', e.target.value)}
                  className="bg-transparent border-b border-dashed border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 w-full py-0.5"
                />
                {selectedEmpresa.web && (
                  <a
                    href={
                      selectedEmpresa.web.startsWith('http')
                        ? selectedEmpresa.web
                        : `https://${selectedEmpresa.web}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Abrir web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Identification and Address Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Grupo Empresarial / Consorcio
              </label>
              <input
                type="text"
                value={selectedEmpresa.grupo || ''}
                onChange={(e) => handleInlineSave('grupo', e.target.value)}
                placeholder="Ej. Grupo Mondragón, Holding..."
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                NIT / CIF (Identificación Fiscal)
              </label>
              <input
                type="text"
                value={selectedEmpresa.nit || ''}
                onChange={(e) => handleInlineSave('nit', e.target.value)}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Dirección</label>
                <input
                  type="text"
                  value={selectedEmpresa.direccion || ''}
                  onChange={(e) => handleInlineSave('direccion', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Código Postal</label>
                  <input
                    type="text"
                    value={selectedEmpresa.cp || ''}
                    onChange={(e) => handleInlineSave('cp', e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Ciudad</label>
                  <input
                    type="text"
                    value={selectedEmpresa.ciudad || ''}
                    onChange={(e) => handleInlineSave('ciudad', e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase">Provincia</label>
                <input
                  type="text"
                  value={selectedEmpresa.provincia || ''}
                  onChange={(e) => handleInlineSave('provincia', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase">País</label>
                <input
                  type="text"
                  value={selectedEmpresa.pais || ''}
                  onFocus={() => setShowCountrySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCountrySuggestions(false), 200)}
                  onChange={(e) => handleInlineSave('pais', e.target.value)}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                  placeholder="Escribe para buscar país..."
                />
                {showCountrySuggestions && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50">
                    {PAISES.filter((p) => p.toLowerCase().includes((selectedEmpresa.pais || '').toLowerCase())).map(
                      (p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => {
                            handleInlineSave('pais', p);
                            setShowCountrySuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tipología del Proveedor */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Tipología del Proveedor
            </label>
            <div className="flex flex-wrap gap-4 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
              {(['fabricante', 'distribuidor', 'servicios', 'otros'] as EmpresaTipo[]).map((tipoOption) => {
                const labelMap = {
                  fabricante: '🏭 Fabricante',
                  distribuidor: '🚚 Distribuidor',
                  servicios: '🛠️ Servicios',
                  otros: '📦 Otros',
                };
                const isChecked =
                  selectedEmpresa.tipo === tipoOption ||
                  (selectedEmpresa.esTambien || []).includes(tipoOption);

                return (
                  <label
                    key={tipoOption}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={async (e) => {
                        const checked = e.target.checked;
                        let newTipo = selectedEmpresa.tipo;
                        let newEsTambien = [...(selectedEmpresa.esTambien || [])];

                        if (checked) {
                          if (newTipo !== tipoOption) {
                            if (!newEsTambien.includes(tipoOption)) {
                              newEsTambien.push(tipoOption);
                            }
                          }
                        } else {
                          if (newTipo === tipoOption) {
                            if (newEsTambien.length > 0) {
                              newTipo = newEsTambien[0];
                              newEsTambien = newEsTambien.filter((t) => t !== newTipo);
                            } else {
                              newTipo = 'otros';
                            }
                          } else {
                            newEsTambien = newEsTambien.filter((t) => t !== tipoOption);
                          }
                        }
                        await onUpdateEmpresa({
                          ...selectedEmpresa,
                          tipo: newTipo,
                          esTambien: newEsTambien,
                        });
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>{labelMap[tipoOption]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Categorización UNSPSC */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              📋 Categorización Estructurada UNSPSC
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {(selectedEmpresa.unspscCodes || []).length === 0 ? (
                <span className="text-xs text-slate-400 italic">
                  No se han asignado códigos UNSPSC a esta empresa.
                </span>
              ) : (
                (selectedEmpresa.unspscCodes || []).map((item) => (
                  <span
                    key={item.code}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold"
                  >
                    <span className="font-mono text-[10px] bg-indigo-100 text-indigo-800 px-1 rounded">
                      {item.code}
                    </span>
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = (selectedEmpresa.unspscCodes || []).filter((u) => u.code !== item.code);
                        await onUpdateEmpresa({ ...selectedEmpresa, unspscCodes: updated });
                      }}
                      className="hover:bg-indigo-100 rounded p-0.5 text-indigo-500 hover:text-rose-600 transition-colors ml-1 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="relative" ref={unspscDropdownRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar código UNSPSC por número o nombre (ej: 31161500, Tornillos)..."
                    value={unspscSearch}
                    onChange={(e) => {
                      setUnspscSearch(e.target.value);
                      setUnspscShowDropdown(true);
                    }}
                    onFocus={() => setUnspscShowDropdown(true)}
                    className="pl-9 w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  {unspscSearch && (
                    <button
                      type="button"
                      onClick={() => setUnspscSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowManualUnspsc(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Código Personalizado</span>
                </button>
              </div>

              {unspscShowDropdown && (
                <div className="absolute z-10 mt-1 w-full max-h-60 bg-white border border-slate-200 rounded-xl shadow-lg overflow-y-auto divide-y divide-slate-100">
                  {isSearchingUnspsc && (
                    <div className="p-3.5 text-xs text-slate-500 text-center flex items-center justify-center gap-2 bg-slate-50/50">
                      <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span>Buscando en catálogo global UNSPSC...</span>
                    </div>
                  )}
                  {!isSearchingUnspsc && filteredUnspscOptions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No se encontraron códigos preestablecidos. Prueba pulsando "Código Personalizado".
                    </div>
                  ) : (
                    filteredUnspscOptions.map((item) => {
                      const isAlreadySelected = (selectedEmpresa.unspscCodes || []).some(
                        (u) => u.code === item.code
                      );
                      return (
                        <button
                          key={item.code}
                          type="button"
                          disabled={isAlreadySelected}
                          onClick={async () => {
                            const current = selectedEmpresa.unspscCodes || [];
                            const updated = [...current, item];
                            await onUpdateEmpresa({ ...selectedEmpresa, unspscCodes: updated });
                            setUnspscSearch('');
                            setUnspscShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer disabled:opacity-50"
                        >
                          <div className="truncate pr-4 flex items-center">
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-2 border border-slate-200">
                              {item.code}
                            </span>
                            <span className="text-slate-700 font-medium truncate">{item.name}</span>
                            {item.segment && (
                              <span className="text-[9px] text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-1 rounded ml-2 shrink-0">
                                {item.segment}
                              </span>
                            )}
                          </div>
                          {isAlreadySelected ? (
                            <span className="text-emerald-600 font-bold text-[10px] shrink-0">✓ Añadido</span>
                          ) : (
                            <span className="text-indigo-600 text-[10px] font-bold shrink-0">+ Añadir</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Custom Manual UNSPSC Form */}
            {showManualUnspsc && (
              <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100/60 pb-1.5">
                  <h5 className="text-[11px] font-bold text-indigo-900 uppercase">
                    Añadir Código UNSPSC Manual
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualUnspsc(false);
                      setManualCode('');
                      setManualName('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-[11px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <label className="block text-[9px] font-bold text-indigo-700 uppercase">
                      Código (8 dígitos)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 31161501"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-indigo-700 uppercase">
                      Descripción o Nombre
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Tornillos Allen de Acero"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualUnspsc(false);
                      setManualCode('');
                      setManualName('');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[10px] rounded border border-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (manualCode.length !== 8) {
                        alert('El código UNSPSC debe tener exactamente 8 dígitos numéricos.');
                        return;
                      }
                      if (!manualName.trim()) {
                        alert('Por favor introduce un nombre o descripción.');
                        return;
                      }
                      const current = selectedEmpresa.unspscCodes || [];
                      const newItem = { code: manualCode, name: manualName.trim(), segment: 'Personalizado' };
                      await onUpdateEmpresa({ ...selectedEmpresa, unspscCodes: [...current, newItem] });
                      setShowManualUnspsc(false);
                      setManualCode('');
                      setManualName('');
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded cursor-pointer"
                  >
                    Guardar Código
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags / Materiales */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Materiales / Categorías de Suministro (Tags)
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50">
              {selectedEmpresa.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:border-slate-300"
                >
                  <Tag className="w-3 h-3 text-indigo-500" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <div className="relative flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Escribir tag..."
                  value={newTagInput}
                  onChange={(e) => {
                    setNewTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTagInput.trim()) {
                        handleAddTag(newTagInput.trim());
                        setNewTagInput('');
                        setShowTagSuggestions(false);
                      }
                    }
                  }}
                  className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs outline-none focus:border-indigo-500 transition-all w-32 font-medium"
                />
                {showTagSuggestions && newTagInput.trim() && (
                  <div className="absolute left-0 bottom-full mb-1 min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 overflow-hidden max-h-48 overflow-y-auto">
                    {!allExistingTags.some((t) => t.toLowerCase() === newTagInput.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onMouseDown={() => {
                          handleAddTag(newTagInput.trim());
                          setNewTagInput('');
                          setShowTagSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear nuevo: "{newTagInput.trim()}"</span>
                      </button>
                    )}
                    {allExistingTags
                      .filter(
                        (tag) =>
                          tag.toLowerCase().includes(newTagInput.trim().toLowerCase()) &&
                          !selectedEmpresa.tags.includes(tag)
                      )
                      .map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => {
                            handleAddTag(tag);
                            setNewTagInput('');
                            setShowTagSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Tag className="w-3 h-3 text-indigo-500" />
                          <span>{tag}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documentos & Certificaciones */}
          <div className="border-t border-slate-150 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Documentos, Certificados y Homologaciones</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddDocForm(!showAddDocForm)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
              >
                {showAddDocForm ? '✕ Cancelar' : '+ Añadir Documento'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 font-normal">
              Gestiona certificados de calidad (ISO 9001/14001), pólizas de seguro, acuerdos de confidencialidad y fichas técnicas.
            </p>

            {showAddDocForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!docNombre.trim()) return;
                  await onAddDocumento(
                    selectedEmpresa.id!,
                    docNombre.trim(),
                    docUrl.trim(),
                    docCaducidad || null
                  );
                  setDocNombre('');
                  setDocCaducidad('');
                  setDocUrl('');
                  setShowAddDocForm(false);
                }}
                className="mb-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm"
              >
                <h5 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">
                  Registrar Nuevo Documento / Certificado
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Nombre del documento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Certificado ISO 9001:2015, Seguro RC..."
                      value={docNombre}
                      onChange={(e) => setDocNombre(e.target.value)}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Fecha de Caducidad (Opcional)
                    </label>
                    <input
                      type="date"
                      value={docCaducidad}
                      onChange={(e) => setDocCaducidad(e.target.value)}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    URL o Enlace al Archivo (Google Drive / OneDrive / Web)
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddDocForm(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                  >
                    Guardar Documento
                  </button>
                </div>
              </form>
            )}

            {docsEmpresa.length === 0 ? (
              <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 italic">No hay documentos registrados para esta empresa.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docsEmpresa.map((doc) => {
                  let diasRestantes: number | null = null;
                  let isExpired = false;
                  let isExpiringSoon = false;

                  if (doc.fechaCaducidad) {
                    const fCad = new Date(doc.fechaCaducidad + 'T12:00:00');
                    diasRestantes = Math.ceil((fCad.getTime() - new Date().getTime()) / 86400000);
                    isExpired = diasRestantes <= 0;
                    isExpiringSoon = diasRestantes > 0 && diasRestantes <= 30;
                  }

                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isExpired
                          ? 'bg-rose-50/50 border-rose-200'
                          : isExpiringSoon
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg ${
                            isExpired
                              ? 'bg-rose-100 text-rose-700'
                              : isExpiringSoon
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 text-xs truncate">{doc.nombre}</p>
                            {doc.url && (
                              <a
                                href={doc.url.startsWith('http') ? doc.url : `https://${doc.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800"
                                title="Abrir enlace"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>Registrado: {new Date(doc.fecha).toLocaleDateString()}</span>
                            {doc.fechaCaducidad && (
                              <span
                                className={`font-semibold px-1.5 py-0.2 rounded ${
                                  isExpired
                                    ? 'bg-rose-100 text-rose-700'
                                    : isExpiringSoon
                                    ? 'bg-amber-100 text-amber-800 font-bold'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isExpired
                                  ? 'Caducado'
                                  : isExpiringSoon
                                  ? `Caduca en ${diasRestantes} días`
                                  : `Caduca: ${doc.fechaCaducidad}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          askConfirmation(
                            "¿Eliminar documento?",
                            `¿Estás seguro de que deseas eliminar el documento "${doc.nombre}"?`,
                            () => onDeleteDocumento(doc.id!),
                            true,
                            "Eliminar"
                          );
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Organigrama y Contactos */}
          <div className="border-t border-slate-150 pt-5">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span>🌳 Organigrama / Jerarquía de Contactos</span>
                </h4>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                  Haz clic sobre cualquier contacto para abrir su ficha y modificar a quién reporta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddContactForm(!showAddContactForm)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer shrink-0"
              >
                {showAddContactForm ? '✕ Cancelar' : '+ Nuevo Contacto'}
              </button>
            </div>

            {showAddContactForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newContactForm.nombre) return;
                  await onUpdateContacto({
                    nombre: newContactForm.nombre,
                    cargo: newContactForm.cargo,
                    telefono: newContactForm.telefono,
                    email: newContactForm.email,
                    reportaA: newContactForm.reportaA,
                    foto: newContactForm.foto || '',
                    empresaId: selectedEmpresa.id!,
                    estado: 'activo',
                    fecha_creacion: new Date().toISOString(),
                    notas: '',
                  });
                  setShowAddContactForm(false);
                  setNewContactForm({ nombre: '', cargo: '', telefono: '', email: '', reportaA: null, foto: '' });
                }}
                className="mb-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm"
              >
                <h5 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">
                  Crear Nuevo Contacto Asociado
                </h5>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newContactForm.nombre}
                    onChange={(e) => setNewContactForm({ ...newContactForm, nombre: e.target.value })}
                    className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Cargo / Rol</label>
                    <input
                      type="text"
                      value={newContactForm.cargo}
                      onChange={(e) => setNewContactForm({ ...newContactForm, cargo: e.target.value })}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500"
                      placeholder="Ej. Director de Compras"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">
                      Superior Jerárquico
                    </label>
                    <select
                      value={newContactForm.reportaA || ''}
                      onChange={(e) =>
                        setNewContactForm({ ...newContactForm, reportaA: e.target.value || null })
                      }
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="">Ninguno / Líder principal</option>
                      {contactosEmpresa.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.cargo || 'Sin cargo'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Teléfono</label>
                    <input
                      type="text"
                      value={newContactForm.telefono}
                      onChange={(e) => setNewContactForm({ ...newContactForm, telefono: e.target.value })}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500"
                      placeholder="Ej. +34 600..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Email</label>
                    <input
                      type="email"
                      value={newContactForm.email}
                      onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
                      className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500"
                      placeholder="juan@empresa.com"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddContactForm(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                  >
                    Guardar Contacto
                  </button>
                </div>
              </form>
            )}

            {/* Organigrama modular */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
              <OrganigramaTree
                contactosEmpresa={contactosEmpresa}
                todosContactos={contactos}
                onSelectContacto={onOpenContacto}
              />
            </div>
          </div>

          {/* Relaciones Fabricante / Distribuidor */}
          {(isFabricante || isDistribuidor) && (
            <div className="border-t border-slate-200 pt-5 space-y-6">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>🔗 Red de Distribución y Alianzas</span>
              </h4>

              {isFabricante && (
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      🚚 Distribuidores Autorizados de sus Productos
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Empresas que distribuyen los productos fabricados por esta empresa.
                    </p>
                  </div>

                  {(() => {
                    const distRels = relaciones.filter((r) => r.fabricanteId === selectedEmpresa.id);
                    if (distRels.length === 0) {
                      return <p className="text-xs text-slate-400 italic">No hay distribuidores asignados aún.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {distRels.map((rel) => {
                          const dist = empresas.find((e) => e.id === rel.distribuidorId);
                          if (!dist) return null;
                          return (
                            <div
                              key={rel.id}
                              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">🚚</span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => onOpenEmpresa?.(dist.id!)}
                                    className="font-bold text-xs text-slate-800 hover:text-indigo-600"
                                  >
                                    {dist.nombre}
                                  </button>
                                  <p className="text-[10px] text-slate-400">
                                    {dist.ciudad || 'Sin ciudad'} {dist.pais ? `· ${dist.pais}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextPref = rel.preferente === 'si' ? 'no' : 'si';
                                    await onUpdateRelacion({ ...rel, preferente: nextPref });
                                  }}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer ${
                                    rel.preferente === 'si'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {rel.preferente === 'si' ? '⭐ Preferente' : 'Normal'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRelacion(rel.id!)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Desvincular"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <RelacionAutocomplete
                      empresas={empresas}
                      tipoEsperado="distribuidor"
                      currentEmpresaId={selectedEmpresa.id!}
                      alreadyLinkedIds={relaciones
                        .filter((r) => r.fabricanteId === selectedEmpresa.id)
                        .map((r) => r.distribuidorId)}
                      onSelectExisting={async (id) => {
                        await onAddRelacion(selectedEmpresa.id!, id, 'no');
                      }}
                      onCreateAndSelect={async (name) => {
                        const newId = await onAddEmpresaRapida(name, 'distribuidor');
                        if (newId) {
                          await onAddRelacion(selectedEmpresa.id!, newId, 'no');
                        }
                      }}
                      placeholder="Buscar o crear distribuidor para vincular..."
                    />
                  </div>
                </div>
              )}

              {isDistribuidor && (
                <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      🏭 Fabricantes Representados
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Marcas y fabricantes que este distribuidor comercializa oficialmente.
                    </p>
                  </div>

                  {(() => {
                    const fabRels = relaciones.filter((r) => r.distribuidorId === selectedEmpresa.id);
                    if (fabRels.length === 0) {
                      return <p className="text-xs text-slate-400 italic">No hay fabricantes vinculados aún.</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {fabRels.map((rel) => {
                          const fab = empresas.find((e) => e.id === rel.fabricanteId);
                          if (!fab) return null;
                          return (
                            <div
                              key={rel.id}
                              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">🏭</span>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => onOpenEmpresa?.(fab.id!)}
                                    className="font-bold text-xs text-slate-800 hover:text-indigo-600"
                                  >
                                    {fab.nombre}
                                  </button>
                                  <p className="text-[10px] text-slate-400">
                                    {fab.ciudad || 'Sin ciudad'} {fab.pais ? `· ${fab.pais}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const nextPref = rel.preferente === 'si' ? 'no' : 'si';
                                    await onUpdateRelacion({ ...rel, preferente: nextPref });
                                  }}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer ${
                                    rel.preferente === 'si'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {rel.preferente === 'si' ? '⭐ Preferente' : 'Normal'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteRelacion(rel.id!)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Desvincular"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <RelacionAutocomplete
                      empresas={empresas}
                      tipoEsperado="fabricante"
                      currentEmpresaId={selectedEmpresa.id!}
                      alreadyLinkedIds={relaciones
                        .filter((r) => r.distribuidorId === selectedEmpresa.id)
                        .map((r) => r.fabricanteId)}
                      onSelectExisting={async (id) => {
                        await onAddRelacion(id, selectedEmpresa.id!, 'no');
                      }}
                      onCreateAndSelect={async (name) => {
                        const newId = await onAddEmpresaRapida(name, 'fabricante');
                        if (newId) {
                          await onAddRelacion(newId, selectedEmpresa.id!, 'no');
                        }
                      }}
                      placeholder="Buscar o crear fabricante para vincular..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Historial de Interacciones */}
          <div className="border-t border-slate-100 pt-5">
            {(() => {
              const cids = contactosEmpresa.map((c) => c.id).filter(Boolean) as string[];
              const interaccionesEmpresa = interacciones.filter((i) => {
                const hasEmpresaId = i.empresaIds?.includes(selectedEmpresa.id!);
                const hasPrimaryContacto = i.contactoId && cids.includes(i.contactoId);
                const hasAnyContacto = i.contactoIds?.some((cid) => cids.includes(cid));
                return hasEmpresaId || hasPrimaryContacto || hasAnyContacto;
              });

              return (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-800 text-sm">
                      Historial de Interacciones con el Proveedor
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddInterFormEmp(!showAddInterFormEmp)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                      >
                        {showAddInterFormEmp ? '✕ Cancelar' : '+ Nueva Interacción'}
                      </button>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                        {interaccionesEmpresa.length}{' '}
                        {interaccionesEmpresa.length === 1 ? 'Interacción' : 'Interacciones'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-4 font-normal">
                    Muestra todas las reuniones, llamadas y correos asociados a este proveedor.
                  </p>

                  {showAddInterFormEmp && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newInterFormEmp.asunto) return;

                        const contactId = newInterFormEmp.contactoId || (contactosEmpresa[0]?.id || '');
                        const finalContactIds = contactId ? [contactId] : [];

                        await onUpdateInteraccion({
                          asunto: newInterFormEmp.asunto,
                          tipo: newInterFormEmp.tipo,
                          fecha: newInterFormEmp.fecha,
                          contactoId: contactId,
                          contactoIds: finalContactIds,
                          empresaIds: [selectedEmpresa.id!],
                          descripcion: newInterFormEmp.descripcion,
                          estado: newInterFormEmp.estado,
                          resolucion: '',
                          pasos: [],
                        });
                        setShowAddInterFormEmp(false);
                        setNewInterFormEmp({
                          asunto: '',
                          tipo: 'reunion',
                          fecha: new Date().toISOString().slice(0, 10),
                          contactoId: '',
                          descripcion: '',
                          estado: 'pendiente',
                        });
                      }}
                      className="mb-4 bg-amber-50/40 border border-amber-150 p-4 rounded-xl space-y-3 shadow-sm"
                    >
                      <h5 className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                        Crear Nueva Interacción
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Asunto / Título *
                          </label>
                          <input
                            type="text"
                            required
                            value={newInterFormEmp.asunto}
                            onChange={(e) =>
                              setNewInterFormEmp({ ...newInterFormEmp, asunto: e.target.value })
                            }
                            className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none"
                            placeholder="Ej. Negociación anual de tarifas"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Contacto Participante *
                          </label>
                          {contactosEmpresa.length === 0 ? (
                            <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 mt-1 font-semibold">
                              ⚠️ Crea un contacto asociado primero.
                            </div>
                          ) : (
                            <select
                              required
                              value={newInterFormEmp.contactoId || (contactosEmpresa[0]?.id || '')}
                              onChange={(e) =>
                                setNewInterFormEmp({ ...newInterFormEmp, contactoId: e.target.value })
                              }
                              className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                            >
                              <option value="">Selecciona un contacto...</option>
                              {contactosEmpresa.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre} ({c.cargo || 'Sin cargo'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                          <select
                            value={newInterFormEmp.tipo}
                            onChange={(e) =>
                              setNewInterFormEmp({ ...newInterFormEmp, tipo: e.target.value as any })
                            }
                            className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                          >
                            <option value="reunion">🤝 Reunión</option>
                            <option value="llamada">📞 Llamada</option>
                            <option value="email">✉️ Correo</option>
                            <option value="feria">🏢 Feria</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha *</label>
                          <input
                            type="date"
                            required
                            value={newInterFormEmp.fecha}
                            onChange={(e) =>
                              setNewInterFormEmp({ ...newInterFormEmp, fecha: e.target.value })
                            }
                            className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Estado inicial
                          </label>
                          <select
                            value={newInterFormEmp.estado}
                            onChange={(e) =>
                              setNewInterFormEmp({ ...newInterFormEmp, estado: e.target.value as any })
                            }
                            className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                          >
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="completada">✅ Completada</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Descripción
                        </label>
                        <textarea
                          value={newInterFormEmp.descripcion}
                          onChange={(e) =>
                            setNewInterFormEmp({ ...newInterFormEmp, descripcion: e.target.value })
                          }
                          rows={2}
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none resize-none"
                          placeholder="Describe brevemente los acuerdos..."
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddInterFormEmp(false)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={contactosEmpresa.length === 0}
                          className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm ${
                            contactosEmpresa.length === 0
                              ? 'bg-slate-300 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          Guardar Interacción
                        </button>
                      </div>
                    </form>
                  )}

                  {interaccionesEmpresa.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">
                        No se han registrado interacciones con este proveedor.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {interaccionesEmpresa
                        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                        .map((i) => {
                          const isCompletada = i.estado === 'completada';
                          return (
                            <div
                              key={i.id}
                              onClick={() => onOpenInteraccion?.(i.id!)}
                              className="group flex flex-col p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isCompletada ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                                    }`}
                                  />
                                  <p className="font-semibold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
                                    {i.asunto}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                                    {i.fecha}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      i.tipo === 'reunion'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-150'
                                        : i.tipo === 'llamada'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-150'
                                        : i.tipo === 'email'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                                        : 'bg-purple-50 text-purple-700 border border-purple-150'
                                    }`}
                                  >
                                    {i.tipo}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 pl-4">
                                {i.descripcion || 'Sin descripción'}
                              </p>
                              {i.resolucion && (
                                <div className="text-[10px] text-emerald-700 bg-emerald-50/50 rounded-lg p-2 mt-2 pl-4 border-l-2 border-emerald-400 font-medium">
                                  <span className="font-bold text-[9px] uppercase tracking-wider block text-emerald-800 mb-0.5">
                                    Resolución:
                                  </span>
                                  {i.resolucion}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Consorcio / Grupo */}
          {selectedEmpresa.grupo && selectedEmpresa.grupo.trim() && (() => {
            const consorcioEmpresas = empresas.filter(
              (e) =>
                e.id !== selectedEmpresa.id &&
                e.grupo &&
                e.grupo.trim().toLowerCase() === selectedEmpresa.grupo!.trim().toLowerCase()
            );
            if (consorcioEmpresas.length === 0) return null;
            return (
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
                  🏢 Otras empresas en el Consorcio "{selectedEmpresa.grupo.trim()}"
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {consorcioEmpresas.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => onOpenEmpresa?.(emp.id!)}
                      className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base group-hover:scale-110 transition-transform">🏢</span>
                        <div>
                          <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                            {emp.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {emp.ciudad || 'Sin ciudad'}, {emp.pais || 'Sin país'}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-50 text-slate-600 border border-slate-200">
                        {emp.estado}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Notas Generales */}
          <div className="border-t border-slate-100 pt-5">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              📝 Notas Generales del Proveedor
            </label>
            <textarea
              value={selectedEmpresa.notas || ''}
              onChange={(e) => handleInlineSave('notas', e.target.value)}
              placeholder="Escribe notas adicionales, acuerdos comerciales o comentarios aquí..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium resize-none leading-relaxed text-slate-700 shadow-sm"
            />
          </div>

          {/* Formulario de Evaluación de Desempeño (KPIs OTIF) */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>⭐ Evaluación de Desempeño y KPIs de Relación</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Establece el rendimiento actual del proveedor para calcular su score y estado oficial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. Cumplimiento de Plazos de Entrega (OTIF)
                  </label>
                  {renderStars(evalPlazos, setEvalPlazos)}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Calidad de Producto / Tasa de Defectos
                  </label>
                  {renderStars(evalCalidad, setEvalCalidad)}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Flexibilidad Comercial y Facturación
                  </label>
                  {renderStars(evalFlexibilidad, setEvalFlexibilidad)}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Observaciones y Justificación de la Evaluación
                  </label>
                  <textarea
                    value={evalComentarios}
                    onChange={(e) => setEvalComentarios(e.target.value)}
                    rows={4}
                    placeholder="Detalla incidentes, mejoras observadas o motivos de la puntuación..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none text-slate-700"
                  />
                </div>

                {(() => {
                  const isComplete = evalPlazos > 0 && evalCalidad > 0 && evalFlexibilidad > 0;
                  const avg = isComplete ? (evalPlazos + evalCalidad + evalFlexibilidad) / 3 : 0;
                  return (
                    <div className="mt-3 p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Score Calculado</span>
                        <p className="text-xl font-black text-slate-800">
                          {isComplete ? `${avg.toFixed(1)} / 5.0` : 'Incompleto'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          !isComplete
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : avg >= 4.0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : avg >= 2.5
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {!isComplete
                          ? 'Pendiente'
                          : avg >= 4.0
                          ? 'Excelente'
                          : avg >= 2.5
                          ? 'Aceptable'
                          : 'Riesgo / No Apto'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span>📅</span>
                {selectedEmpresa.evaluacion?.ultimaActualizacion ? (
                  <span>
                    Última evaluación:{' '}
                    <strong className="text-slate-700">
                      {new Date(selectedEmpresa.evaluacion.ultimaActualizacion).toLocaleString()}
                    </strong>
                  </span>
                ) : (
                  <span>Este proveedor no cuenta con evaluaciones registradas.</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {evalSaveSuccess && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> ¡Guardado con éxito!
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setIsSavingEval(true);
                    const updated = {
                      ...selectedEmpresa,
                      evaluacion: {
                        plazos: evalPlazos,
                        calidad: evalCalidad,
                        flexibilidad: evalFlexibilidad,
                        comentarios: evalComentarios,
                        ultimaActualizacion: new Date().toISOString(),
                      },
                    };
                    await onUpdateEmpresa(updated);
                    setIsSavingEval(false);
                    setEvalSaveSuccess(true);
                    setTimeout(() => setEvalSaveSuccess(false), 4000);
                  }}
                  disabled={isSavingEval || evalPlazos === 0 || evalCalidad === 0 || evalFlexibilidad === 0}
                  className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    evalPlazos === 0 || evalCalidad === 0 || evalFlexibilidad === 0
                      ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {isSavingEval ? 'Guardando...' : 'Guardar Evaluación de KPIs'}
                </button>
              </div>
            </div>
          </div>

          {/* Estado de Homologación Oficial */}
          <div className="border-t border-slate-200 pt-5">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <span>📋 Estado de Homologación Oficial</span>
              </label>
              <select
                value={estadoSeleccionado}
                onChange={async (e) => {
                  const nuevoEstado = e.target.value as any;
                  setEstadoSeleccionado(nuevoEstado);
                  await handleInlineSave('estado', nuevoEstado);
                }}
                className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-sm focus:border-indigo-500 outline-none font-semibold text-slate-700 transition-all shadow-sm cursor-pointer"
              >
                <option value="prospecto">🔵 Prospecto (Sin homologar)</option>
                <option value="en_proceso">⏳ En proceso de homologación</option>
                <option value="homologado">✅ Homologado oficial</option>
                <option value="en_cuarentena">⚠️ En cuarentena / Observación</option>
                <option value="no_apto">🚫 No apto / Rechazado</option>
                <option value="inactivo">⚫ Inactivo / De baja</option>
                <option value="validado">✅ Validado / Homologado</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                El estado de homologación oficial determina las condiciones comerciales y de auditoría con este proveedor.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

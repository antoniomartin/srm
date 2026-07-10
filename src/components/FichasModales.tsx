/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Save, Trash2, Tag, Plus, File, ExternalLink, Globe, Sparkles, AlertCircle, CheckCircle2, Link, MapPin, Check, Pencil, Phone
} from 'lucide-react';
import md5 from 'blueimp-md5';
import { Empresa, Contacto, Interaccion, Documento, Relacion, PasoInteraccion, EmpresaTipo } from '../types';
import { SearchSelect } from './SearchSelect';

interface NodoJerarquia {
  contacto: Contacto;
  subordinados: NodoJerarquia[];
}

const JerarquiaNodo: React.FC<{
  nodo: NodoJerarquia;
  nivel: number;
  onSelectContacto?: (id: string) => void;
  todosContactos: Contacto[];
}> = ({ nodo, nivel, onSelectContacto, todosContactos }) => {
  const { contacto, subordinados } = nodo;
  
  const superior = contacto.reportaA 
    ? todosContactos.find(c => c.id === contacto.reportaA) 
    : null;

  return (
    <div className="relative pl-3.5 border-l-2 border-slate-100 ml-1.5 sm:ml-3.5 py-1.5">
      {/* Connector line for child nodes */}
      {nivel > 0 && (
        <span className="absolute left-0 top-7 w-3 h-px bg-slate-200"></span>
      )}
      
      <div 
        onClick={() => onSelectContacto?.(contacto.id!)}
        className="group relative flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            contacto.estado === 'inactivo' 
              ? 'bg-slate-100 text-slate-400' 
              : nivel === 0 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-indigo-50 text-indigo-700'
          }`}>
            {contacto.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors">
                {contacto.nombre}
              </p>
              {nivel === 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Líder / Superior
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {contacto.cargo || 'Sin cargo definido'}
            </p>
            {superior && (
              <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                Reporta a: <span className="font-medium text-slate-500">{superior.nombre}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            contacto.estado === 'activo' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
              : 'bg-rose-50 text-rose-700 border border-rose-150'
          }`}>
            {contacto.estado}
          </span>
        </div>
      </div>

      {subordinados.length > 0 && (
        <div className="mt-2 space-y-2">
          {subordinados.map((sub, idx) => (
            <JerarquiaNodo 
              key={sub.contacto.id || idx} 
              nodo={sub} 
              nivel={nivel + 1} 
              onSelectContacto={onSelectContacto}
              todosContactos={todosContactos}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FichasModalesProps {
  // Detail Overlay States
  selectedEmpresa: Empresa | null;
  selectedContacto: Contacto | null;
  selectedInteraccion: Interaccion | null;
  
  // Close Callbacks
  onCloseEmpresa: () => void;
  onCloseContacto: () => void;
  onCloseInteraccion: () => void;

  // Selection Callbacks
  onOpenContacto?: (id: string) => void;
  onOpenInteraccion?: (id: string) => void;

  // Collections
  empresas: Empresa[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  documentos: Documento[];
  relaciones: Relacion[];

  // CRUD actions
  onUpdateEmpresa: (emp: Empresa) => Promise<void>;
  onDeleteEmpresa: (id: string) => Promise<void>;
  onUpdateContacto: (cont: Contacto) => Promise<void>;
  onDeleteContacto: (id: string) => Promise<void>;
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  onDeleteInteraccion: (id: string) => Promise<void>;
  onAddRelacion: (fabId: string, distId: string, pref: 'si' | 'no') => Promise<void>;
  onAddEmpresaRapida: (nombre: string, tipo: EmpresaTipo) => Promise<string | undefined>;
  onUpdateRelacion: (rel: Relacion) => Promise<void>;
  onDeleteRelacion: (id: string) => Promise<void>;
  onAddDocumento: (empId: string, nombre: string, url: string, caducidad: string | null) => Promise<void>;
  onDeleteDocumento: (id: string) => Promise<void>;
  
  // Custom functions
  onGeocodeManual: (empId: string) => void;
  onGeneratePDF: (emp: Empresa) => void;
  scores: { [id: string]: { nivel: string; label: string; dias: number | null } };
}

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
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter existing companies
  const filtered = empresas.filter(e => {
    // Must be of the expected type
    const isOfTipo = e.tipo === tipoEsperado || (e.esTambien || []).includes(tipoEsperado);
    if (!isOfTipo) return false;

    // Cannot be the current company
    if (e.id === currentEmpresaId) return false;

    // Cannot be already linked
    if (alreadyLinkedIds.includes(e.id || '')) return false;

    // Match query
    if (!query.trim()) return true;
    return e.nombre.toLowerCase().includes(query.toLowerCase().trim());
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

  // Check if the query matches exactly any existing company of ANY type
  const exactMatch = query.trim() 
    ? empresas.some(e => e.nombre.toLowerCase() === query.toLowerCase().trim())
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
              {filtered.map(emp => (
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

          {/* Proposal to create a new one */}
          {query.trim() && !exactMatch && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              <div
                onClick={() => handleCreate(query)}
                className="px-3 py-2.5 text-xs bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold cursor-pointer flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">Crear nueva empresa: <span className="font-bold underline">"{query.trim()}"</span></p>
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

export const FichasModales: React.FC<FichasModalesProps> = ({
  selectedEmpresa,
  selectedContacto,
  selectedInteraccion,
  onCloseEmpresa,
  onCloseContacto,
  onCloseInteraccion,
  onOpenContacto,
  onOpenInteraccion,
  empresas,
  contactos,
  interacciones,
  documentos,
  relaciones,
  onUpdateEmpresa,
  onDeleteEmpresa,
  onUpdateContacto,
  onDeleteContacto,
  onUpdateInteraccion,
  onDeleteInteraccion,
  onAddRelacion,
  onAddEmpresaRapida,
  onUpdateRelacion,
  onDeleteRelacion,
  onAddDocumento,
  onDeleteDocumento,
  onGeocodeManual,
  onGeneratePDF,
  scores,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  // States for editing interaction steps
  const [editingPasoIndex, setEditingPasoIndex] = useState<number | null>(null);
  const [editingPasoText, setEditingPasoText] = useState('');
  const [editingPasoDate, setEditingPasoDate] = useState('');

  // Drag and drop attachment state
  const [dragActive, setDragDropActive] = useState(false);
  const [docNombre, setDocNombre] = useState('');
  const [docCaducidad, setDocCaducidad] = useState('');

  // Call Gemini AI insights endpoint
  const generateAiInsights = async (entityType: 'empresa' | 'contacto', id: string, name: string, details: any) => {
    setIsLoading(true);
    try {
      // Collect interaction history
      let history: any[] = [];
      if (entityType === 'empresa') {
        const conts = contactos.filter(c => c.empresaId === id || c.empresaIds?.includes(id));
        const cids = conts.map(c => c.id);
        history = interacciones
          .filter(i => {
            const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
            return ids.some(cid => cids.includes(cid));
          })
          .map(i => ({ date: i.fecha, type: i.tipo, title: i.asunto, desc: i.descripcion, res: i.resolucion }));
      } else {
        history = interacciones
          .filter(i => {
            const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
            return ids.includes(id);
          })
          .map(i => ({ date: i.fecha, type: i.tipo, title: i.asunto, desc: i.descripcion }));
      }

      const resp = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, name, details, history }),
      });

      if (!resp.ok) throw new Error("Error calling AI service");
      const data = await resp.json();
      setAiResponse(data.insights);
    } catch (err) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');
  const [isAiLoading, setIsLoading] = useState(false);

  // Tag editing state
  const [newTagInput, setNewTagInput] = useState('');

  // Inline forms states for direct creations from Fichas
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

  const [showAddInterFormCont, setShowAddInterFormCont] = useState(false);
  const [newInterFormCont, setNewInterFormCont] = useState({
    asunto: '',
    tipo: 'reunion' as 'reunion' | 'llamada' | 'email' | 'feria',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
    estado: 'pendiente' as 'pendiente' | 'completada',
  });

  const [selectedContactoGravatarFailed, setSelectedContactoGravatarFailed] = useState(false);

  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDestructive: boolean = true,
    confirmLabel: string = "Eliminar",
    cancelLabel: string = "Cancelar"
  ) => {
    setCustomConfirm({
      isOpen: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      isDestructive,
      onConfirm: async () => {
        await onConfirm();
        setCustomConfirm(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const selectedContactoGravatarUrl = React.useMemo(() => {
    if (!selectedContacto?.email || !selectedContacto.email.trim()) return null;
    const hash = md5(selectedContacto.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=150&d=404`;
  }, [selectedContacto?.email]);

  // Reset forms on selection change
  useEffect(() => {
    setShowAddContactForm(false);
    setShowAddInterFormEmp(false);
    setShowAddInterFormCont(false);
    setSelectedContactoGravatarFailed(false);
    setNewContactForm({ nombre: '', cargo: '', telefono: '', email: '', reportaA: null, foto: '' });
    setNewInterFormEmp({ asunto: '', tipo: 'reunion', fecha: new Date().toISOString().slice(0, 10), contactoId: '', descripcion: '', estado: 'pendiente' });
    setNewInterFormCont({ asunto: '', tipo: 'reunion', fecha: new Date().toISOString().slice(0, 10), descripcion: '', estado: 'pendiente' });
  }, [selectedEmpresa?.id, selectedContacto?.id, selectedContacto?.email]);

  const handleAddTag = async (empresa: Empresa, tag: string) => {
    if (!tag.trim() || empresa.tags.includes(tag)) return;
    const updated = { ...empresa, tags: [...empresa.tags, tag] };
    await onUpdateEmpresa(updated);
  };

  const handleRemoveTag = async (empresa: Empresa, tag: string) => {
    const updated = { ...empresa, tags: empresa.tags.filter(t => t !== tag) };
    await onTagClickUpdate(updated);
  };

  const onTagClick = (tag: string) => {
    // Expose tag filtering upward if needed
  };

  // Helper for inline input editing save
  const handleInlineSave = async (tipo: 'empresa' | 'contacto', id: string, field: string, value: any) => {
    if (tipo === 'empresa') {
      const emp = empresas.find(e => e.id === id);
      if (emp) {
        (emp as any)[field] = value;
        await saveEmpresaDirect(emp);
      }
    } else {
      const cont = contactos.find(c => c.id === id);
      if (cont) {
        (cont as any)[field] = value;
        await saveContactoDirect(cont);
      }
    }
  };

  const saveEmpresaDirect = async (emp: Empresa) => {
    await onUpdateEmpresa(emp);
  };

  const saveContactoDirect = async (cont: Contacto) => {
    await onUpdateContacto(cont);
  };

  const onTagClickUpdate = async (emp: Empresa) => {
    await onUpdateEmpresa(emp);
  };

  if (!selectedEmpresa && !selectedContacto && !selectedInteraccion) return null;

  return (
    <>
      {/* 1. Empresa Detail Overlay */}
      {selectedEmpresa && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end transition-all duration-300">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {[selectedEmpresa.tipo, ...(selectedEmpresa.esTambien || [])]
                    .filter((val, index, self) => val && self.indexOf(val) === index)
                    .map(role => (
                      <span key={role} className="text-[10px] font-bold text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-400/20 uppercase tracking-wider">
                        {role === 'fabricante' ? '🏭 fabricante' : role === 'distribuidor' ? '🚚 distribuidor' : role === 'servicios' ? '🛠️ servicios' : '📦 ' + role}
                      </span>
                    ))
                  }
                </div>
                <h2 className="text-2xl font-bold mt-1 text-slate-50">{selectedEmpresa.nombre}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${
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
                  }`}>
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
                      : 'Prospecto'
                    }
                  </span>
                  <span className="text-xs text-slate-400">NIT: {selectedEmpresa.nit || 'Sin NIT'}</span>
                </div>
              </div>
              <button onClick={onCloseEmpresa} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
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
                  onClick={() => generateAiInsights('empresa', selectedEmpresa.id!, selectedEmpresa.nombre, selectedEmpresa)}
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
                        onCloseEmpresa();
                      }
                    );
                  }}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>

              {/* AI Insights Display */}
              {isAiLoading && (
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
                  <button onClick={() => setAiResponse(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Recomendaciones Inteligentes de Gemini
                  </h4>
                  <div className="prose prose-indigo max-w-none text-xs space-y-2 whitespace-pre-wrap leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              )}

              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado de Homologación Oficial</label>
                  <select
                    value={selectedEmpresa.estado}
                    onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'estado', e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm focus:border-indigo-500 outline-none font-semibold text-slate-700 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="prospecto">🔵 Prospecto (Sin homologar)</option>
                    <option value="en_proceso">⏳ En proceso de homologación</option>
                    <option value="homologado">✅ Homologado oficial</option>
                    <option value="en_cuarentena">⚠️ En cuarentena / Observación</option>
                    <option value="no_apto">🚫 No apto / Rechazado</option>
                    <option value="inactivo">⚫ Inactivo / De baja</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    El estado de homologación oficial determina las condiciones comerciales y de auditoría con este proveedor.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <div className="mt-1 flex gap-1">
                    <input 
                      type="text" 
                      value={selectedEmpresa.telefono} 
                      onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'telefono', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                    {selectedEmpresa.telefono && (
                      <div className="flex gap-1">
                        <a
                          href={`tel:${selectedEmpresa.telefono}`}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 transition-colors cursor-pointer"
                          title="Llamar directamente"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                        </a>
                        <a
                          href={(() => {
                            const clean = selectedEmpresa.telefono.replace(/[^\d]/g, '');
                            const finalPhone = (clean.length === 9 && (clean.startsWith('6') || clean.startsWith('7') || clean.startsWith('9'))) ? '34' + clean : clean;
                            const hour = new Date().getHours();
                            const saludo = hour < 12 ? 'Buenos\u00A0d\u00EDas' : 'Buenas\u00A0tardes';
                            const text = `${saludo}, `;
                            return `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 transition-colors cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.665.988 3.3.15 5.36.15 5.51 0 9.995-4.485 9.999-10 .002-2.673-1.04-5.186-2.935-7.082C17.13 3.328 14.62 2.283 12 2.28 6.49 2.28 2.005 6.765 2.001 12.28c-.002 2.01.523 3.974 1.52 5.711l-.997 3.642 3.734-.98z"/>
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Email corporativo</label>
                  <input 
                    type="email" 
                    value={selectedEmpresa.email} 
                    onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'email', e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Sitio Web</label>
                  <div className="mt-1 flex gap-1">
                    <input 
                      type="text" 
                      value={selectedEmpresa.web} 
                      onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'web', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                    {selectedEmpresa.web && (
                      <a
                        href={selectedEmpresa.web.trim().startsWith('http://') || selectedEmpresa.web.trim().startsWith('https://') 
                          ? selectedEmpresa.web.trim() 
                          : `https://${selectedEmpresa.web.trim()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 transition-colors cursor-pointer"
                        title="Visitar sitio web en el navegador"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Grupo / Consorcio</label>
                  <input 
                    type="text" 
                    value={selectedEmpresa.grupo || ''} 
                    onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'grupo', e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Dirección</label>
                    <input 
                      type="text" 
                      value={selectedEmpresa.direccion || ''} 
                      onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'direccion', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">Ciudad</label>
                    <input 
                      type="text" 
                      value={selectedEmpresa.ciudad || ''} 
                      onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'ciudad', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase">País</label>
                    <input 
                      type="text" 
                      value={selectedEmpresa.pais || ''} 
                      onChange={(e) => handleInlineSave('empresa', selectedEmpresa.id!, 'pais', e.target.value)}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Tipología del Proveedor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipología del Proveedor</label>
                <div className="flex flex-wrap gap-4 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedEmpresa.tipo === 'fabricante' || (selectedEmpresa.esTambien || []).includes('fabricante')}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;
                        let newTipo = selectedEmpresa.tipo;
                        let newEsTambien = [...(selectedEmpresa.esTambien || [])];

                        if (isChecked) {
                          if (newTipo !== 'fabricante') {
                            if (!newEsTambien.includes('fabricante')) {
                              newEsTambien.push('fabricante');
                            }
                          }
                        } else {
                          if (newTipo === 'fabricante') {
                            if (newEsTambien.length > 0) {
                              newTipo = newEsTambien[0];
                              newEsTambien = newEsTambien.filter(t => t !== newTipo);
                            } else {
                              newTipo = 'otros';
                            }
                          } else {
                            newEsTambien = newEsTambien.filter(t => t !== 'fabricante');
                          }
                        }
                        const updated = { ...selectedEmpresa, tipo: newTipo, esTambien: newEsTambien };
                        await onUpdateEmpresa(updated);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>🏭 Fabricante</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedEmpresa.tipo === 'distribuidor' || (selectedEmpresa.esTambien || []).includes('distribuidor')}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;
                        let newTipo = selectedEmpresa.tipo;
                        let newEsTambien = [...(selectedEmpresa.esTambien || [])];

                        if (isChecked) {
                          if (newTipo !== 'distribuidor') {
                            if (!newEsTambien.includes('distribuidor')) {
                              newEsTambien.push('distribuidor');
                            }
                          }
                        } else {
                          if (newTipo === 'distribuidor') {
                            if (newEsTambien.length > 0) {
                              newTipo = newEsTambien[0];
                              newEsTambien = newEsTambien.filter(t => t !== newTipo);
                            } else {
                              newTipo = 'otros';
                            }
                          } else {
                            newEsTambien = newEsTambien.filter(t => t !== 'distribuidor');
                          }
                        }
                        const updated = { ...selectedEmpresa, tipo: newTipo, esTambien: newEsTambien };
                        await onUpdateEmpresa(updated);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>🚚 Distribuidor</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedEmpresa.tipo === 'servicios' || (selectedEmpresa.esTambien || []).includes('servicios')}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;
                        let newTipo = selectedEmpresa.tipo;
                        let newEsTambien = [...(selectedEmpresa.esTambien || [])];

                        if (isChecked) {
                          if (newTipo !== 'servicios') {
                            if (!newEsTambien.includes('servicios')) {
                              newEsTambien.push('servicios');
                            }
                          }
                        } else {
                          if (newTipo === 'servicios') {
                            if (newEsTambien.length > 0) {
                              newTipo = newEsTambien[0];
                              newEsTambien = newEsTambien.filter(t => t !== newTipo);
                            } else {
                              newTipo = 'otros';
                            }
                          } else {
                            newEsTambien = newEsTambien.filter(t => t !== 'servicios');
                          }
                        }
                        const updated = { ...selectedEmpresa, tipo: newTipo, esTambien: newEsTambien };
                        await onUpdateEmpresa(updated);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>🛠️ Servicios</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={selectedEmpresa.tipo === 'otros' || (selectedEmpresa.esTambien || []).includes('otros')}
                      onChange={async (e) => {
                        const isChecked = e.target.checked;
                        let newTipo = selectedEmpresa.tipo;
                        let newEsTambien = [...(selectedEmpresa.esTambien || [])];

                        if (isChecked) {
                          if (newTipo !== 'otros') {
                            if (!newEsTambien.includes('otros')) {
                              newEsTambien.push('otros');
                            }
                          }
                        } else {
                          if (newTipo === 'otros') {
                            if (newEsTambien.length > 0) {
                              newTipo = newEsTambien[0];
                              newEsTambien = newEsTambien.filter(t => t !== newTipo);
                            } else {
                              newTipo = 'fabricante';
                            }
                          } else {
                            newEsTambien = newEsTambien.filter(t => t !== 'otros');
                          }
                        }
                        const updated = { ...selectedEmpresa, tipo: newTipo, esTambien: newEsTambien };
                        await onUpdateEmpresa(updated);
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span>📦 Otros</span>
                  </label>
                </div>
              </div>

              {/* Tag Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Materiales / Categorías de Suministro</label>
                <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50">
                  {selectedEmpresa.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:border-slate-300">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      {tag}
                      <button onClick={() => handleRemoveTag(selectedEmpresa, tag)} className="text-slate-400 hover:text-rose-600 font-bold ml-1">✕</button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input 
                      type="text" 
                      placeholder="Nuevo tag..." 
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(selectedEmpresa, newTagInput);
                          setNewTagInput('');
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs outline-none focus:border-indigo-500 transition-all w-24"
                    />
                  </div>
                </div>
              </div>

              {/* Contact list for this company */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-1 flex items-center justify-between">
                  <span>Organigrama / Jerarquía de Contactos</span>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                    Interactiva
                  </span>
                </h4>
                <div className="flex justify-between items-start mb-4 gap-2">
                  <p className="text-[11px] text-slate-400 font-normal flex-1">
                    Haz clic sobre cualquier contacto para abrir su ficha y asignar o modificar su superior jerárquico.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddContactForm(!showAddContactForm)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors shrink-0 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 cursor-pointer"
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
                        estado: 'activo'
                      });
                      setShowAddContactForm(false);
                      setNewContactForm({ nombre: '', cargo: '', telefono: '', email: '', reportaA: null, foto: '' });
                    }}
                    className="mb-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm"
                  >
                    <h5 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">Crear Nuevo Contacto Asociado</h5>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={newContactForm.nombre}
                        onChange={(e) => setNewContactForm({ ...newContactForm, nombre: e.target.value })}
                        className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Superior Jerárquico</label>
                        <select
                          value={newContactForm.reportaA || ''}
                          onChange={(e) => setNewContactForm({ ...newContactForm, reportaA: e.target.value || null })}
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="">Ninguno / Líder principal</option>
                          {contactos
                            .filter(c => c.empresaId === selectedEmpresa.id || c.empresaIds?.includes(selectedEmpresa.id!))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} ({c.cargo || 'Sin cargo'})</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Teléfono móvil</label>
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

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Foto de Perfil (Enlace o archivo)</label>
                      <div className="mt-1 flex flex-col gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                        <div className="flex gap-2">
                          {newContactForm.foto && (
                            <img
                              src={newContactForm.foto}
                              alt="Previsualización"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          )}
                          <input
                            type="text"
                            value={newContactForm.foto || ''}
                            onChange={(e) => setNewContactForm({ ...newContactForm, foto: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded py-1 px-2 text-xs outline-none focus:border-indigo-500"
                            placeholder="Pega un enlace de foto de LinkedIn o de cualquier web..."
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <span className="text-[9px] text-slate-400">O sube una imagen:</span>
                          <label className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 rounded text-[10px] font-bold text-slate-700 cursor-pointer transition-all">
                            📁 Seleccionar Archivo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setNewContactForm({ ...newContactForm, foto: reader.result });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
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

                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                  {(() => {
                    const contactosEmpresa = contactos.filter(c => c.empresaId === selectedEmpresa.id || c.empresaIds?.includes(selectedEmpresa.id!));
                    
                    if (contactosEmpresa.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 text-center py-4">
                          No hay contactos vinculados a este proveedor.
                        </p>
                      );
                    }

                    // Construir Jerarquía
                    const map: { [id: string]: NodoJerarquia } = {};
                    contactosEmpresa.forEach(c => {
                      if (c.id) {
                        map[c.id] = { contacto: c, subordinados: [] };
                      }
                    });

                    const raices: NodoJerarquia[] = [];
                    contactosEmpresa.forEach(c => {
                      if (!c.id) return;
                      const reportaAId = c.reportaA;
                      if (reportaAId && map[reportaAId]) {
                        map[reportaAId].subordinados.push(map[c.id]);
                      } else {
                        raices.push(map[c.id]);
                      }
                    });

                    return (
                      <div className="space-y-2">
                        {raices.map((raiz, idx) => (
                          <JerarquiaNodo 
                            key={raiz.contacto.id || idx} 
                            nodo={raiz} 
                            nivel={0} 
                            todosContactos={contactos}
                            onSelectContacto={(id) => {
                              if (onOpenContacto) {
                                onOpenContacto(id);
                              }
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Relaciones Fabricante / Distribuidor */}
              {(() => {
                const isFabricante = selectedEmpresa.tipo === 'fabricante' || (selectedEmpresa.esTambien || []).includes('fabricante');
                const isDistribuidor = selectedEmpresa.tipo === 'distribuidor' || (selectedEmpresa.esTambien || []).includes('distribuidor');
                if (!isFabricante && !isDistribuidor) return null;

                return (
                  <div className="border-t border-slate-200 pt-5 space-y-6">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <span>🔗 Red de Distribución y Alianzas</span>
                    </h4>
                    
                    {/* SI ES FABRICANTE -> Ver y gestionar sus Distribuidores */}
                    {isFabricante && (
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 space-y-4">
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            🚚 Distribuidores Autorizados de sus Productos
                          </h5>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Empresas que distribuyen los productos fabricados por esta empresa.
                          </p>
                        </div>

                        {/* List of distributors */}
                        {(() => {
                          const distRels = relaciones.filter(r => r.fabricanteId === selectedEmpresa.id);
                          if (distRels.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 italic">No hay distribuidores asignados aún.</p>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {distRels.map(rel => {
                                const dist = empresas.find(e => e.id === rel.distribuidorId);
                                if (!dist) return null;
                                const isPref = rel.preferente === 'si';
                                return (
                                  <div key={rel.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-lg">🚚</span>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{dist.nombre}</p>
                                        <p className="text-[10px] font-mono text-slate-400">{dist.ciudad || 'Sin ciudad'}, {dist.pais || 'Sin país'}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {/* Star button for Preferente */}
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const nextPref = isPref ? 'no' : 'si';
                                          if (nextPref === 'si') {
                                            for (const r of distRels) {
                                              if (r.id) {
                                                await onUpdateRelacion({
                                                  ...r,
                                                  preferente: r.id === rel.id ? 'si' : 'no'
                                                });
                                              }
                                            }
                                          } else {
                                            await onUpdateRelacion({
                                              ...rel,
                                              preferente: 'no'
                                            });
                                          }
                                        }}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                          isPref 
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-150' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                                        }`}
                                        title={isPref ? "Quitar como preferente" : "Marcar como distribuidor preferente"}
                                      >
                                        ⭐ {isPref ? 'Preferente' : 'Hacer Preferente'}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          askConfirmation(
                                            "¿Desvincular Distribuidor?",
                                            `¿Estás seguro de que deseas desvincular a "${dist.nombre}"?`,
                                            async () => {
                                              if (rel.id) await onDeleteRelacion(rel.id);
                                            }
                                          );
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                        title="Desvincular distribuidor"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Add distributor form */}
                        <div className="pt-3 border-t border-slate-150">
                          <RelacionAutocomplete
                            empresas={empresas}
                            tipoEsperado="distribuidor"
                            alreadyLinkedIds={relaciones
                              .filter(r => r.fabricanteId === selectedEmpresa.id)
                              .map(r => r.distribuidorId)
                            }
                            currentEmpresaId={selectedEmpresa.id!}
                            placeholder="Escribe para buscar o crear nuevo distribuidor..."
                            onSelectExisting={async (id) => {
                              await onAddRelacion(selectedEmpresa.id!, id, 'no');
                            }}
                            onCreateAndSelect={async (nombre) => {
                              const newId = await onAddEmpresaRapida(nombre, 'distribuidor');
                              if (newId) {
                                await onAddRelacion(selectedEmpresa.id!, newId, 'no');
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SI ES DISTRIBUIDOR -> Ver y gestionar sus Fabricantes */}
                    {isDistribuidor && (
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 space-y-4">
                        <div>
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            🏭 Fabricantes que Distribuye esta Empresa
                          </h5>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Marcas y fabricantes de los cuales esta empresa es distribuidor autorizado.
                          </p>
                        </div>

                        {/* List of manufacturers */}
                        {(() => {
                          const fabRels = relaciones.filter(r => r.distribuidorId === selectedEmpresa.id);
                          if (fabRels.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 italic">No hay fabricantes asignados aún.</p>
                            );
                          }
                          return (
                            <div className="space-y-2">
                              {fabRels.map(rel => {
                                const fab = empresas.find(e => e.id === rel.fabricanteId);
                                if (!fab) return null;
                                const isPref = rel.preferente === 'si';
                                return (
                                  <div key={rel.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-lg">🏭</span>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{fab.nombre}</p>
                                        <p className="text-[10px] font-mono text-slate-400">{fab.ciudad || 'Sin ciudad'}, {fab.pais || 'Sin país'}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      {isPref && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                          ⭐ Distribuidor Preferente
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => {
                                           askConfirmation(
                                             "¿Desvincular Fabricante?",
                                             `¿Estás seguro de que deseas desvincular el fabricante "${fab.nombre}"?`,
                                             async () => {
                                               if (rel.id) await onDeleteRelacion(rel.id);
                                             }
                                           );
                                         }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                        title="Desvincular fabricante"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Add manufacturer form */}
                        <div className="pt-3 border-t border-slate-150">
                          <RelacionAutocomplete
                            empresas={empresas}
                            tipoEsperado="fabricante"
                            alreadyLinkedIds={relaciones
                              .filter(r => r.distribuidorId === selectedEmpresa.id)
                              .map(r => r.fabricanteId)
                            }
                            currentEmpresaId={selectedEmpresa.id!}
                            placeholder="Escribe para buscar o crear nuevo fabricante..."
                            onSelectExisting={async (id) => {
                              await onAddRelacion(id, selectedEmpresa.id!, 'no');
                            }}
                            onCreateAndSelect={async (nombre) => {
                              const newId = await onAddEmpresaRapida(nombre, 'fabricante');
                              if (newId) {
                                await onAddRelacion(newId, selectedEmpresa.id!, 'no');
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Historial de Interacciones del Proveedor */}
              <div>
                {(() => {
                  const conts = contactos.filter(c => c.empresaId === selectedEmpresa.id || c.empresaIds?.includes(selectedEmpresa.id!));
                  const cids = conts.map(c => c.id).filter(Boolean) as string[];
                  const interaccionesEmpresa = interacciones.filter(i => {
                    const hasEmpresaId = i.empresaIds?.includes(selectedEmpresa.id!);
                    const hasPrimaryContacto = i.contactoId && cids.includes(i.contactoId);
                    const hasAnyContacto = i.contactoIds?.some(cid => cids.includes(cid));
                    return hasEmpresaId || hasPrimaryContacto || hasAnyContacto;
                  });

                  return (
                    <div className="border-t border-slate-100 pt-5">
                      <h4 className="font-bold text-slate-800 text-sm mb-1 flex items-center justify-between">
                        <span>Historial de Interacciones con el Proveedor</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddInterFormEmp(!showAddInterFormEmp)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors shrink-0 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 cursor-pointer"
                          >
                            {showAddInterFormEmp ? '✕ Cancelar' : '+ Nueva Interacción'}
                          </button>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                            {interaccionesEmpresa.length} {interaccionesEmpresa.length === 1 ? 'Interacción' : 'Interacciones'}
                          </span>
                        </div>
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-4 font-normal">
                        Muestra todas las interacciones directas o gestionadas a través de los contactos vinculados. Haz clic para ver detalles.
                      </p>

                      {showAddInterFormEmp && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newInterFormEmp.asunto) return;
                            
                            // Prepare participant lists
                            const contactId = newInterFormEmp.contactoId || (conts[0]?.id || '');
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
                              pasos: []
                            });
                            setShowAddInterFormEmp(false);
                            setNewInterFormEmp({
                              asunto: '',
                              tipo: 'reunion',
                              fecha: new Date().toISOString().slice(0, 10),
                              contactoId: '',
                              descripcion: '',
                              estado: 'pendiente'
                            });
                          }}
                          className="mb-4 bg-amber-50/40 border border-amber-150 p-4 rounded-xl space-y-3 shadow-sm"
                        >
                          <h5 className="text-[11px] font-bold text-amber-950 uppercase tracking-wide">Crear Nueva Interacción</h5>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Asunto / Título *</label>
                              <input
                                type="text"
                                required
                                value={newInterFormEmp.asunto}
                                onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, asunto: e.target.value })}
                                className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                                placeholder="Ej. Reunión de tarifas"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Contacto Participante *</label>
                              {conts.length === 0 ? (
                                <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 mt-1 font-semibold">
                                  ⚠️ Crea un contacto asociado primero.
                                </div>
                              ) : (
                                <select
                                  required
                                  value={newInterFormEmp.contactoId || (conts[0]?.id || '')}
                                  onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, contactoId: e.target.value })}
                                  className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                                >
                                  <option value="">Selecciona un contacto...</option>
                                  {conts.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre} ({c.cargo || 'Sin cargo'})</option>
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
                                onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, tipo: e.target.value as any })}
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
                                onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, fecha: e.target.value })}
                                className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Estado inicial</label>
                              <select
                                value={newInterFormEmp.estado}
                                onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, estado: e.target.value as any })}
                                className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                              >
                                <option value="pendiente">⏳ Pendiente</option>
                                <option value="completada">✅ Completada</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Descripción / Detalles</label>
                            <textarea
                              value={newInterFormEmp.descripcion}
                              onChange={(e) => setNewInterFormEmp({ ...newInterFormEmp, descripcion: e.target.value })}
                              rows={2}
                              className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all resize-none"
                              placeholder="Describe brevemente los temas tratados..."
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
                              disabled={conts.length === 0}
                              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm ${
                                conts.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
                              Guardar Interacción
                            </button>
                          </div>
                        </form>
                      )}

                      {interaccionesEmpresa.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs text-slate-500 font-medium">No se han registrado interacciones con este proveedor.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {interaccionesEmpresa
                            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                            .map(i => {
                              const isCompletada = i.estado === 'completada';
                              return (
                                <div 
                                  key={i.id}
                                  onClick={() => {
                                    if (onOpenInteraccion) {
                                      onOpenInteraccion(i.id!);
                                    }
                                  }}
                                  className="group flex flex-col p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${isCompletada ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                      <p className="font-semibold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
                                        {i.asunto}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                                        {i.fecha}
                                      </span>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        i.tipo === 'reunion' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                        i.tipo === 'llamada' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                                        i.tipo === 'email' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                        'bg-purple-50 text-purple-700 border border-purple-150'
                                      }`}>
                                        {i.tipo}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 pl-4">
                                    {i.descripcion || 'Sin descripción'}
                                  </p>
                                  {i.resolucion && (
                                    <div className="text-[10px] text-emerald-700 bg-emerald-50/50 rounded-lg p-2 mt-2 pl-4 border-l-2 border-emerald-400 font-medium">
                                      <span className="font-bold text-[9px] uppercase tracking-wider block text-emerald-800 mb-0.5">Resolución:</span>
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
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={onCloseEmpresa} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Contacto Detail Overlay */}
      {selectedContacto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end transition-all duration-300">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
            {/* Header */}
            <div className="p-6 bg-indigo-900 text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                {selectedContacto.foto ? (
                  <img
                    src={selectedContacto.foto}
                    alt={selectedContacto.nombre}
                    className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (!selectedContactoGravatarFailed && selectedContactoGravatarUrl) ? (
                  <img
                    src={selectedContactoGravatarUrl}
                    alt={selectedContacto.nombre}
                    className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                    referrerPolicy="no-referrer"
                    onError={() => setSelectedContactoGravatarFailed(true)}
                  />
                ) : (
                  <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-xl font-bold shadow-inner border border-white/20 uppercase">
                    {(selectedContacto.nombre || 'U').slice(0, 2)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold text-slate-50">{selectedContacto.nombre}</h2>
                  <p className="text-sm text-indigo-200 font-medium mt-0.5">{selectedContacto.cargo || 'Sin cargo'}</p>
                </div>
              </div>
              <button onClick={onCloseContacto} className="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-850 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                <button 
                  onClick={() => generateAiInsights('contacto', selectedContacto.id!, selectedContacto.nombre, selectedContacto)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Obtener Informe de Contacto IA
                </button>
                <button 
                  onClick={() => {
                    askConfirmation(
                      "¿Eliminar Contacto?",
                      `¿Estás seguro de que deseas eliminar permanentemente al contacto "${selectedContacto.nombre}"? Esta acción no se puede deshacer.`,
                      () => {
                        onDeleteContacto(selectedContacto.id!);
                        onCloseContacto();
                      }
                    );
                  }}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>

              {/* AI response display */}
              {isAiLoading && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl animate-pulse text-sm text-indigo-700 font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-bounce" /> Elaborando perfil de contacto inteligente...
                </div>
              )}
              {aiResponse && (
                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 p-5 rounded-xl text-sm text-slate-700 relative shadow-sm">
                  <button onClick={() => setAiResponse(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                  <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Perfil y Recomendación de IA
                  </h4>
                  <div className="prose prose-indigo text-xs whitespace-pre-wrap leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              )}

              {/* Profile details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono móvil</label>
                  <div className="mt-1 flex gap-1">
                    <input 
                      type="text" 
                      value={selectedContacto.telefono} 
                      onChange={(e) => handleInlineSave('contacto', selectedContacto.id!, 'telefono', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                    {selectedContacto.telefono && (
                      <div className="flex gap-1">
                        <a
                          href={`tel:${selectedContacto.telefono}`}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 transition-colors cursor-pointer"
                          title="Llamar directamente"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                        </a>
                        <a
                          href={(() => {
                            const clean = selectedContacto.telefono.replace(/[^\d]/g, '');
                            const finalPhone = (clean.length === 9 && (clean.startsWith('6') || clean.startsWith('7') || clean.startsWith('9'))) ? '34' + clean : clean;
                            const hour = new Date().getHours();
                            const saludo = hour < 12 ? 'Buenos\u00A0d\u00EDas' : 'Buenas\u00A0tardes';
                            const firstName = (selectedContacto.nombre || '').trim().split(/\s+/)[0];
                            const text = `${saludo} ${firstName}, `;
                            return `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 transition-colors cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.665.988 3.3.15 5.36.15 5.51 0 9.995-4.485 9.999-10 .002-2.673-1.04-5.186-2.935-7.082C17.13 3.328 14.62 2.283 12 2.28 6.49 2.28 2.005 6.765 2.001 12.28c-.002 2.01.523 3.974 1.52 5.711l-.997 3.642 3.734-.98z"/>
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Email personal/profesional</label>
                  <input 
                    type="email" 
                    value={selectedContacto.email} 
                    onChange={(e) => handleInlineSave('contacto', selectedContacto.id!, 'email', e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Enlace LinkedIn (Perfil)</label>
                  <div className="mt-1 flex gap-1">
                    <input 
                      type="text" 
                      value={selectedContacto.linkedin} 
                      onChange={(e) => handleInlineSave('contacto', selectedContacto.id!, 'linkedin', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                    {selectedContacto.linkedin && (
                      <a
                        href={selectedContacto.linkedin.trim().startsWith('http://') || selectedContacto.linkedin.trim().startsWith('https://') 
                          ? selectedContacto.linkedin.trim() 
                          : `https://${selectedContacto.linkedin.trim()}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 transition-colors cursor-pointer"
                        title="Visitar perfil de LinkedIn en el navegador"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Foto de Perfil (URL o subir archivo)</label>
                  <div className="mt-1 flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={selectedContacto.foto || ''} 
                        onChange={(e) => handleInlineSave('contacto', selectedContacto.id!, 'foto', e.target.value)}
                        placeholder="Pega un enlace de foto de LinkedIn o de cualquier web..."
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                      />
                      {selectedContacto.foto && (
                        <button
                          type="button"
                          onClick={() => handleInlineSave('contacto', selectedContacto.id!, 'foto', '')}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-100 text-xs font-bold transition-colors cursor-pointer shrink-0"
                          title="Eliminar foto"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 border-t border-slate-150 pt-3">
                      <div className="text-[10px] text-slate-400">
                        O selecciona un archivo de imagen desde tu dispositivo:
                      </div>
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1 shadow-sm shrink-0">
                        📁 Subir Imagen
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  handleInlineSave('contacto', selectedContacto.id!, 'foto', reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Superior Jerárquico (Reporta A)</label>
                  <SearchSelect 
                    placeholder="Escribe para buscar superior jerárquico..."
                    value={selectedContacto.reportaA || ''} 
                    onChange={(val) => handleInlineSave('contacto', selectedContacto.id!, 'reportaA', val || null)}
                    options={contactos
                      .filter(c => c.id !== selectedContacto.id && (c.empresaId === selectedContacto.empresaId || c.empresaIds?.includes(selectedContacto.empresaId)))
                      .map(c => ({ value: c.id!, label: c.nombre, sublabel: c.cargo || 'Sin cargo' }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Notas del contacto</label>
                  <textarea 
                    value={selectedContacto.notas} 
                    onChange={(e) => handleInlineSave('contacto', selectedContacto.id!, 'notas', e.target.value)}
                    rows={3}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Empresa(s) para las que trabaja */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center gap-1.5">
                    🏢 Empresa(s) para las que trabaja
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Empresa Principal</label>
                      <SearchSelect 
                        placeholder="Escribe para buscar empresa..."
                        value={selectedContacto.empresaId || ''} 
                        onChange={(val) => handleInlineSave('contacto', selectedContacto.id!, 'empresaId', val)}
                        options={empresas.map(e => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Otras Empresas Vinculadas</label>
                      <div className="mt-1 flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1 border border-slate-200 rounded-lg bg-white p-2 min-h-[36px]">
                          {empresas
                            .filter(e => selectedContacto.empresaIds?.includes(e.id!) && e.id !== selectedContacto.empresaId)
                            .map(e => (
                              <span key={e.id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-semibold border border-indigo-150">
                                {e.nombre}
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const currentIds = selectedContacto.empresaIds || [];
                                    const updatedIds = currentIds.filter(id => id !== e.id);
                                    handleInlineSave('contacto', selectedContacto.id!, 'empresaIds', updatedIds);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-600 font-bold"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          {empresas.filter(e => selectedContacto.empresaIds?.includes(e.id!) && e.id !== selectedContacto.empresaId).length === 0 && (
                            <span className="text-[10px] text-slate-400 p-0.5 italic">Sin otras empresas vinculadas</span>
                          )}
                        </div>
                        
                        {/* SearchSelect for adding another company */}
                        <SearchSelect
                          placeholder="+ Vincular otra empresa..."
                          value=""
                          onChange={(val) => {
                            if (!val) return;
                            const currentIds = selectedContacto.empresaIds || [];
                            if (!currentIds.includes(val)) {
                              handleInlineSave('contacto', selectedContacto.id!, 'empresaIds', [...currentIds, val]);
                            }
                          }}
                          options={empresas
                            .filter(e => e.id !== selectedContacto.empresaId && !(selectedContacto.empresaIds || []).includes(e.id!))
                            .map(e => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historial de Interacciones del Contacto */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                  {(() => {
                    const contactInteractions = interacciones.filter(i => {
                      const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
                      return ids.includes(selectedContacto.id!);
                    });

                    return (
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase mb-1 flex items-center justify-between">
                          <span>📅 Historial de Interacciones del Contacto</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAddInterFormCont(!showAddInterFormCont)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors shrink-0 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-100 cursor-pointer"
                            >
                              {showAddInterFormCont ? '✕ Cancelar' : '+ Nueva Interacción'}
                            </button>
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                              {contactInteractions.length} {contactInteractions.length === 1 ? 'Interacción' : 'Interacciones'}
                            </span>
                          </div>
                        </h4>
                        <p className="text-[11px] text-slate-400 mb-3 font-normal">
                          Muestra todas las reuniones, llamadas, correos o ferias asociadas a este contacto. Haz clic para ver detalles.
                        </p>

                        {showAddInterFormCont && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!newInterFormCont.asunto) return;

                              const companyIds = selectedContacto.empresaId ? [selectedContacto.empresaId] : [];

                              await onUpdateInteraccion({
                                asunto: newInterFormCont.asunto,
                                tipo: newInterFormCont.tipo,
                                fecha: newInterFormCont.fecha,
                                contactoId: selectedContacto.id!,
                                contactoIds: [selectedContacto.id!],
                                empresaIds: companyIds,
                                descripcion: newInterFormCont.descripcion,
                                estado: newInterFormCont.estado,
                                pasos: []
                              });
                              setShowAddInterFormCont(false);
                              setNewInterFormCont({
                                asunto: '',
                                tipo: 'reunion',
                                fecha: new Date().toISOString().slice(0, 10),
                                descripcion: '',
                                estado: 'pendiente'
                              });
                            }}
                            className="mb-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm"
                          >
                            <h5 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">Crear Nueva Interacción para {selectedContacto.nombre}</h5>
                            
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Asunto / Título *</label>
                              <input
                                type="text"
                                required
                                value={newInterFormCont.asunto}
                                onChange={(e) => setNewInterFormCont({ ...newInterFormCont, asunto: e.target.value })}
                                className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                                placeholder="Ej. Reunión de seguimiento o llamada de tarifas"
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                                <select
                                  value={newInterFormCont.tipo}
                                  onChange={(e) => setNewInterFormCont({ ...newInterFormCont, tipo: e.target.value as any })}
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
                                  value={newInterFormCont.fecha}
                                  onChange={(e) => setNewInterFormCont({ ...newInterFormCont, fecha: e.target.value })}
                                  className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Estado inicial</label>
                                <select
                                  value={newInterFormCont.estado}
                                  onChange={(e) => setNewInterFormCont({ ...newInterFormCont, estado: e.target.value as any })}
                                  className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-indigo-500"
                                >
                                  <option value="pendiente">⏳ Pendiente</option>
                                  <option value="completada">✅ Completada</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase">Descripción / Detalles</label>
                              <textarea
                                value={newInterFormCont.descripcion}
                                onChange={(e) => setNewInterFormCont({ ...newInterFormCont, descripcion: e.target.value })}
                                rows={2}
                                className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all resize-none"
                                placeholder="Describe brevemente los temas tratados..."
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowAddInterFormCont(false)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm"
                              >
                                Guardar Interacción
                              </button>
                            </div>
                          </form>
                        )}
                        
                        {contactInteractions.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 font-medium">No se han registrado interacciones con este contacto.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                            {contactInteractions
                              .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                              .map(i => {
                                const isCompletada = i.estado === 'completada';
                                return (
                                  <div 
                                    key={i.id}
                                    onClick={() => {
                                      if (onOpenInteraccion) {
                                        onOpenInteraccion(i.id!);
                                      }
                                    }}
                                    className="group flex flex-col p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${isCompletada ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                        <p className="font-semibold text-slate-800 text-xs group-hover:text-indigo-600 transition-colors">
                                          {i.asunto}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150">
                                          {i.fecha}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          i.tipo === 'reunion' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                          i.tipo === 'llamada' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                                          i.tipo === 'email' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                          'bg-purple-50 text-purple-700 border border-purple-150'
                                        }`}>
                                          {i.tipo}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 pl-4">
                                      {i.descripcion || 'Sin descripción'}
                                    </p>
                                    {i.resolucion && (
                                      <div className="text-[10px] text-emerald-700 bg-emerald-50/50 rounded p-1.5 mt-1.5 pl-4 border-l-2 border-emerald-400 font-medium">
                                        <span className="font-bold text-[9px] uppercase tracking-wider block text-emerald-800 mb-0.5">Resolución:</span>
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
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={onCloseContacto} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Interaccion Detail Overlay */}
      {selectedInteraccion && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end transition-all duration-300">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200">
            {/* Header */}
            <div className="p-6 bg-amber-600 text-white flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">{selectedInteraccion.tipo}</span>
                <h2 className="text-2xl font-bold mt-1 text-slate-50">{selectedInteraccion.asunto}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedInteraccion.estado === 'completada' ? 'bg-emerald-500/20 text-white' : 'bg-rose-500/20 text-white animate-pulse'
                  }`}>
                    {selectedInteraccion.estado}
                  </span>
                  <span className="text-xs text-amber-100">Fecha: {selectedInteraccion.fecha}</span>
                </div>
              </div>
              <button onClick={onCloseInteraccion} className="p-2 text-amber-100 hover:text-white rounded-lg hover:bg-amber-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                <button 
                  onClick={() => {
                    askConfirmation(
                      "¿Eliminar Interacción?",
                      `¿Estás seguro de que deseas eliminar permanentemente esta interacción con asunto "${selectedInteraccion.asunto}"? Esta acción no se puede deshacer.`,
                      () => {
                        onDeleteInteraccion(selectedInteraccion.id!);
                        onCloseInteraccion();
                      }
                    );
                  }}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </div>

              {/* Status and description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Detalle o Minuta de la Interacción</label>
                  <textarea 
                    value={selectedInteraccion.descripcion} 
                    onChange={(e) => {
                      selectedInteraccion.descripcion = e.target.value;
                      onUpdateInteraccion(selectedInteraccion);
                    }}
                    rows={4}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase">Resolución / Conclusión final</label>
                  <textarea 
                    value={selectedInteraccion.resolucion || ''} 
                    onChange={(e) => {
                      selectedInteraccion.resolucion = e.target.value;
                      onUpdateInteraccion(selectedInteraccion);
                    }}
                    rows={2}
                    placeholder="Borrador de resolución..."
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* Personas que intervinieron (Participantes) */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">👥 Personas que Intervinieron</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-normal">
                      Interactivo
                    </span>
                  </h4>
                  
                  {(() => {
                    const participantIds = Array.from(new Set([
                      ...(selectedInteraccion.contactoId ? [selectedInteraccion.contactoId] : []),
                      ...(selectedInteraccion.contactoIds || [])
                    ])).filter(Boolean);

                    const participantesList = contactos.filter(c => c.id && participantIds.includes(c.id));

                    return (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {participantesList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No hay participantes registrados para esta interacción.</p>
                          ) : (
                            participantesList.map(cont => {
                              // Find their primary company
                              const empresaPrincipal = empresas.find(e => e.id === cont.empresaId);
                              // Find other companies they work for
                              const otrasEmpresas = empresas.filter(e => 
                                cont.empresaIds?.includes(e.id!) && e.id !== cont.empresaId
                              );

                              return (
                                <div 
                                  key={cont.id}
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-white hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                      {cont.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p 
                                        onClick={() => {
                                          if (onOpenContacto) {
                                            onOpenContacto(cont.id!);
                                          }
                                        }}
                                        className="font-semibold text-slate-800 text-xs sm:text-sm hover:text-indigo-600 transition-colors cursor-pointer"
                                      >
                                        {cont.nombre}
                                      </p>
                                      <p className="text-[11px] text-slate-500">
                                        {cont.cargo || 'Sin cargo'}
                                      </p>
                                      
                                      {/* Companies list */}
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {empresaPrincipal && (
                                          <span className="inline-flex items-center bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-semibold border border-indigo-150">
                                            🏢 {empresaPrincipal.nombre}
                                          </span>
                                        )}
                                        {otrasEmpresas.map(e => (
                                          <span key={e.id} className="inline-flex items-center bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.5 rounded font-medium border border-slate-250">
                                            🏢 {e.nombre}
                                          </span>
                                        ))}
                                        {!empresaPrincipal && otrasEmpresas.length === 0 && (
                                          <span className="text-[10px] text-slate-400">Sin empresa vinculada</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Delete participant from interaction (if more than 1) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (participantIds.length <= 1) {
                                        alert("La interacción debe tener al menos un participante.");
                                        return;
                                      }
                                      askConfirmation(
                                        "¿Quitar Participante?",
                                        `¿Estás seguro de que deseas quitar a "${cont.nombre}" de esta interacción?`,
                                        () => {
                                          const updatedContactoIds = participantIds.filter(id => id !== cont.id);
                                          const updatedCompanies = Array.from(new Set(
                                            contactos
                                              .filter(c => c.id && updatedContactoIds.includes(c.id))
                                              .map(c => c.empresaId)
                                              .filter(Boolean)
                                          ));
                                          
                                          const updatedInter = {
                                            ...selectedInteraccion,
                                            contactoId: updatedContactoIds[0],
                                            contactoIds: updatedContactoIds,
                                            empresaIds: updatedCompanies
                                          };
                                          onUpdateInteraccion(updatedInter);
                                        },
                                        false,
                                        "Quitar"
                                      );
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Quitar participante"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Add another participant select */}
                        <div className="flex flex-col gap-2 mt-2 bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Añadir participante:</label>
                          <SearchSelect
                            placeholder="Escribe para buscar y añadir participante..."
                            value=""
                            onChange={(val) => {
                              if (!val) return;
                              if (participantIds.includes(val)) return;

                              const updatedContactoIds = [...participantIds, val];
                              const updatedCompanies = Array.from(new Set([
                                ...(selectedInteraccion.empresaIds || []),
                                ...contactos
                                  .filter(c => c.id && updatedContactoIds.includes(c.id))
                                  .map(c => c.empresaId)
                                  .filter(Boolean)
                              ]));

                              const updatedInter = {
                                ...selectedInteraccion,
                                contactoId: updatedContactoIds[0],
                                contactoIds: updatedContactoIds,
                                empresaIds: updatedCompanies
                              };
                              onUpdateInteraccion(updatedInter);
                            }}
                            options={contactos
                              .filter(c => !participantIds.includes(c.id!))
                              .map(c => {
                                const empName = empresas.find(e => e.id === c.empresaId)?.nombre || 'Sin empresa';
                                return { value: c.id!, label: c.nombre, sublabel: empName };
                              })
                            }
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Sub-steps / checklist */}
                <div>
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-3">📋 Plan de Pasos & Compromisos</h4>
                  <div className="space-y-2">
                    {(selectedInteraccion.pasos || []).map((paso, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 gap-2">
                        {editingPasoIndex === idx ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input 
                              type="text"
                              value={editingPasoText}
                              onChange={(e) => setEditingPasoText(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none focus:border-indigo-500 font-medium"
                            />
                            <input 
                              type="date"
                              value={editingPasoDate}
                              onChange={(e) => setEditingPasoDate(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs outline-none font-medium"
                            />
                            <button
                              onClick={() => {
                                if (editingPasoText.trim()) {
                                  const updatedPasos = [...(selectedInteraccion.pasos || [])];
                                  updatedPasos[idx] = { 
                                    ...paso, 
                                    texto: editingPasoText.trim(), 
                                    fecha: editingPasoDate 
                                  };
                                  selectedInteraccion.pasos = updatedPasos;
                                  onUpdateInteraccion(selectedInteraccion);
                                  setEditingPasoIndex(null);
                                }
                              }}
                              className="p-1 px-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                              title="Guardar"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingPasoIndex(null)}
                              className="p-1 px-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-bold transition-colors cursor-pointer"
                              title="Cancelar"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={paso.completado || false}
                                onChange={(e) => {
                                  const updatedPasos = [...(selectedInteraccion.pasos || [])];
                                  updatedPasos[idx] = { ...paso, completado: e.target.checked };
                                  selectedInteraccion.pasos = updatedPasos;
                                  onUpdateInteraccion(selectedInteraccion);
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <span className="text-sm text-slate-700">
                                {paso.texto}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                {paso.fecha}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingPasoIndex(idx);
                                  setEditingPasoText(paso.texto);
                                  setEditingPasoDate(paso.fecha || '');
                                }}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  askConfirmation(
                                    "¿Eliminar paso?",
                                    `¿Estás seguro de que deseas eliminar este paso o compromiso: "${paso.texto}"?`,
                                    () => {
                                      const updatedPasos = (selectedInteraccion.pasos || []).filter((_, i) => i !== idx);
                                      selectedInteraccion.pasos = updatedPasos;
                                      onUpdateInteraccion(selectedInteraccion);
                                    },
                                    true,
                                    "Eliminar Paso"
                                  );
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    {/* Add new paso inline */}
                    <div className="flex items-center gap-2 mt-3">
                      <input 
                        type="text" 
                        id="new-step-text"
                        placeholder="Compromiso o paso a realizar..."
                        className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                      <input 
                        type="date" 
                        id="new-step-date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                      />
                      <button 
                        onClick={() => {
                          const txtInput = document.getElementById('new-step-text') as HTMLInputElement;
                          const dateInput = document.getElementById('new-step-date') as HTMLInputElement;
                          if (txtInput && txtInput.value.trim()) {
                            const steps = [...(selectedInteraccion.pasos || [])];
                            steps.push({ texto: txtInput.value.trim(), fecha: dateInput.value, completado: false });
                            selectedInteraccion.pasos = steps;
                            onUpdateInteraccion(selectedInteraccion);
                            txtInput.value = '';
                          }
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button 
                onClick={() => {
                  selectedInteraccion.estado = selectedInteraccion.estado === 'pendiente' ? 'completada' : 'pendiente';
                  onUpdateInteraccion(selectedInteraccion);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  selectedInteraccion.estado === 'completada'
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-sm'
                }`}
              >
                {selectedInteraccion.estado === 'completada' ? 'Reabrir como Pendiente' : '✓ Completar Interacción'}
              </button>
              <button onClick={onCloseInteraccion} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Custom Confirmation Modal */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  customConfirm.isDestructive 
                    ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}>
                  <AlertCircle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">{customConfirm.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {customConfirm.message}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCustomConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
              >
                {customConfirm.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                }}
                className={`px-4 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer ${
                  customConfirm.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {customConfirm.confirmLabel || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Trash2, Phone, Mail, ExternalLink, Sparkles, AlertCircle, Plus, Tag,
  Briefcase, UserCheck, UserX, User, Building2
} from 'lucide-react';
import md5 from 'blueimp-md5';
import { Contacto, Empresa, Interaccion } from '../../types';
import { SearchSelect } from '../SearchSelect';

export interface ContactoDetailModalProps {
  selectedContacto: Contacto | null;
  isCreating?: boolean;
  onClose: () => void;
  empresas: Empresa[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  onUpdateContacto: (cont: Contacto) => Promise<void>;
  onCreateContacto?: (cont: Omit<Contacto, 'id'>) => Promise<string | undefined>;
  onDeleteContacto: (id: string) => Promise<void>;
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  onOpenEmpresa?: (id: string) => void;
  onOpenInteraccion?: (id: string) => void;
  onOpenContacto?: (id: string) => void;
  askConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDestructive?: boolean,
    confirmLabel?: string,
    cancelLabel?: string
  ) => void;
}

export const ContactoDetailModal: React.FC<ContactoDetailModalProps> = ({
  selectedContacto,
  isCreating = false,
  onClose,
  empresas,
  contactos,
  interacciones,
  onUpdateContacto,
  onCreateContacto,
  onDeleteContacto,
  onUpdateInteraccion,
  onOpenEmpresa,
  onOpenInteraccion,
  onOpenContacto,
  askConfirmation,
}) => {
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');

  // Local state for all fields (supports immediate creation & smooth editing)
  const [localNombre, setLocalNombre] = useState(selectedContacto?.nombre || '');
  const [localEmpresaId, setLocalEmpresaId] = useState(selectedContacto?.empresaId || '');
  const [localCargo, setLocalCargo] = useState(selectedContacto?.cargo || '');
  const [localReportaA, setLocalReportaA] = useState<string | null>(selectedContacto?.reportaA || null);
  const [localTelefono, setLocalTelefono] = useState(selectedContacto?.telefono || '');
  const [localEmail, setLocalEmail] = useState(selectedContacto?.email || '');
  const [localLinkedin, setLocalLinkedin] = useState(selectedContacto?.linkedin || '');
  const [localFoto, setLocalFoto] = useState(selectedContacto?.foto || '');
  const [localNotas, setLocalNotas] = useState(selectedContacto?.notas || '');
  const [localEstado, setLocalEstado] = useState<'activo' | 'inactivo'>(selectedContacto?.estado || 'activo');
  const [localMotivoInactivo, setLocalMotivoInactivo] = useState(selectedContacto?.motivoInactivo || '');
  const [localEmpresaConocido, setLocalEmpresaConocido] = useState<string[]>(
    Array.isArray(selectedContacto?.empresaConocido)
      ? selectedContacto.empresaConocido
      : selectedContacto?.empresaConocido
      ? [selectedContacto.empresaConocido]
      : []
  );
  const [localEmpresasAnteriores, setLocalEmpresasAnteriores] = useState<string[]>(
    selectedContacto?.empresasAnteriores || []
  );
  const [localIntereses, setLocalIntereses] = useState<string[]>(selectedContacto?.intereses || []);
  const [localEmpresaIds, setLocalEmpresaIds] = useState<string[]>(selectedContacto?.empresaIds || []);

  const [createError, setCreateError] = useState<string | null>(null);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Inline interaction creation
  const [showAddInterFormCont, setShowAddInterFormCont] = useState(false);
  const [newInterFormCont, setNewInterFormCont] = useState({
    asunto: '',
    tipo: 'reunion' as 'reunion' | 'llamada' | 'email' | 'feria',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
    estado: 'pendiente' as 'pendiente' | 'completada',
  });

  // Contact tags suggestion inputs
  const [newEmpresaConocidoInput, setNewEmpresaConocidoInput] = useState('');
  const [showEmpresaConocidoSuggestions, setShowEmpresaConocidoSuggestions] = useState(false);

  const [newEmpresasAnterioresInput, setNewEmpresasAnterioresInput] = useState('');
  const [showEmpresasAnterioresSuggestions, setShowEmpresasAnterioresSuggestions] = useState(false);

  const [newInteresesInput, setNewInteresesInput] = useState('');
  const [showInteresesSuggestions, setShowInteresesSuggestions] = useState(false);

  // Sync local state when contact changes or when entering creation mode
  useEffect(() => {
    setGravatarFailed(false);
    setAiResponse(null);
    setAiError('');
    setCreateError(null);
    setShowAddInterFormCont(false);
    setLocalNombre(selectedContacto?.nombre || '');
    setLocalEmpresaId(selectedContacto?.empresaId || '');
    setLocalCargo(selectedContacto?.cargo || '');
    setLocalReportaA(selectedContacto?.reportaA || null);
    setLocalTelefono(selectedContacto?.telefono || '');
    setLocalEmail(selectedContacto?.email || '');
    setLocalLinkedin(selectedContacto?.linkedin || '');
    setLocalFoto(selectedContacto?.foto || '');
    setLocalNotas(selectedContacto?.notas || '');
    setLocalEstado(selectedContacto?.estado || 'activo');
    setLocalMotivoInactivo(selectedContacto?.motivoInactivo || '');
    setLocalEmpresaConocido(
      Array.isArray(selectedContacto?.empresaConocido)
        ? selectedContacto.empresaConocido
        : selectedContacto?.empresaConocido
        ? [selectedContacto.empresaConocido]
        : []
    );
    setLocalEmpresasAnteriores(selectedContacto?.empresasAnteriores || []);
    setLocalIntereses(selectedContacto?.intereses || []);
    setLocalEmpresaIds(selectedContacto?.empresaIds || []);
  }, [selectedContacto, isCreating]);

  // Duplicate contact detection in creation mode
  const duplicateContacto = useMemo(() => {
    if (!isCreating) return null;
    const rawName = (localNombre || '').trim().toLowerCase();
    const rawEmail = (localEmail || '').trim().toLowerCase();
    const rawTel = (localTelefono || '').replace(/\D/g, '');

    if (!rawName && !rawEmail && !rawTel) return null;

    const normalizePersonName = (str: string) => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    const normName = normalizePersonName(rawName);

    return contactos.find((c) => {
      if (selectedContacto?.id && c.id === selectedContacto.id) return false;
      // 1. Email exact match
      if (rawEmail && c.email) {
        if (c.email.trim().toLowerCase() === rawEmail) return true;
      }
      // 2. Phone match (at least 8 digits)
      if (rawTel && rawTel.length >= 8 && c.telefono) {
        const existTel = c.telefono.replace(/\D/g, '');
        if (existTel === rawTel || existTel.endsWith(rawTel) || rawTel.endsWith(existTel)) return true;
      }
      // 3. Name match in same company
      if (normName.length >= 3 && localEmpresaId) {
        const existNorm = normalizePersonName(c.nombre || '');
        if (existNorm === normName) {
          const inSameEmpresa = c.empresaId === localEmpresaId || (c.empresaIds && c.empresaIds.includes(localEmpresaId));
          if (inSameEmpresa) return true;
        }
      }
      return false;
    }) || null;
  }, [isCreating, localNombre, localEmail, localTelefono, localEmpresaId, contactos, selectedContacto?.id]);

  const gravatarUrl = useMemo(() => {
    const emailToUse = localEmail.trim() || selectedContacto?.email?.trim();
    if (!emailToUse) return null;
    const hash = md5(emailToUse.toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=150&d=404`;
  }, [localEmail, selectedContacto?.email]);

  const handleInlineSave = async (field: string, value: any) => {
    if (field === 'nombre') setLocalNombre(value);
    if (field === 'empresaId') setLocalEmpresaId(value);
    if (field === 'cargo') setLocalCargo(value);
    if (field === 'reportaA') setLocalReportaA(value);
    if (field === 'telefono') setLocalTelefono(value);
    if (field === 'email') setLocalEmail(value);
    if (field === 'linkedin') setLocalLinkedin(value);
    if (field === 'foto') setLocalFoto(value);
    if (field === 'notas') setLocalNotas(value);
    if (field === 'estado') setLocalEstado(value);
    if (field === 'motivoInactivo') setLocalMotivoInactivo(value);
    if (field === 'empresaConocido') setLocalEmpresaConocido(value);
    if (field === 'empresasAnteriores') setLocalEmpresasAnteriores(value);
    if (field === 'intereses') setLocalIntereses(value);
    if (field === 'empresaIds') setLocalEmpresaIds(value);

    // If creating a new contact, we only update local state until Save button is clicked
    if (isCreating || !selectedContacto?.id) return;

    const updated = { ...selectedContacto, [field]: value };
    await onUpdateContacto(updated);
  };

  // Save a text field on blur (called when user leaves the input in edit mode)
  const handleBlurSave = useCallback((field: string, value: string) => {
    if (isCreating || !selectedContacto?.id) return;
    if ((selectedContacto as any)[field] !== value) {
      handleInlineSave(field, value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContacto, isCreating]);

  const existingEmpresaConocidoTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contactos.forEach((c) => {
      if (c.empresaConocido) {
        if (Array.isArray(c.empresaConocido)) {
          c.empresaConocido.forEach((tag) => {
            if (tag && tag.trim()) tagsSet.add(tag.trim());
          });
        } else if (typeof c.empresaConocido === 'string') {
          const trimmed = (c.empresaConocido as string).trim();
          if (trimmed) tagsSet.add(trimmed);
        }
      }
    });
    return Array.from(tagsSet).sort();
  }, [contactos]);

  const existingEmpresasAnterioresTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contactos.forEach((c) => {
      if (c.empresasAnteriores && Array.isArray(c.empresasAnteriores)) {
        c.empresasAnteriores.forEach((tag) => {
          if (tag && tag.trim()) tagsSet.add(tag.trim());
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [contactos]);

  const existingInteresesTags = useMemo(() => {
    const tagsSet = new Set<string>();
    contactos.forEach((c) => {
      if (c.intereses && Array.isArray(c.intereses)) {
        c.intereses.forEach((tag) => {
          if (tag && tag.trim()) tagsSet.add(tag.trim());
        });
      }
    });
    return Array.from(tagsSet).sort();
  }, [contactos]);

  const handleAddTag = async (
    field: 'empresaConocido' | 'empresasAnteriores' | 'intereses',
    tag: string
  ) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    let currentTags: string[] = [];
    if (field === 'empresaConocido') currentTags = [...localEmpresaConocido];
    else if (field === 'empresasAnteriores') currentTags = [...localEmpresasAnteriores];
    else if (field === 'intereses') currentTags = [...localIntereses];

    if (currentTags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return;

    const updatedTags = [...currentTags, trimmed];
    await handleInlineSave(field, updatedTags);
  };

  const handleRemoveTag = async (
    field: 'empresaConocido' | 'empresasAnteriores' | 'intereses',
    tag: string
  ) => {
    let currentTags: string[] = [];
    if (field === 'empresaConocido') currentTags = [...localEmpresaConocido];
    else if (field === 'empresasAnteriores') currentTags = [...localEmpresasAnteriores];
    else if (field === 'intereses') currentTags = [...localIntereses];

    const updatedTags = currentTags.filter((t) => t !== tag);
    await handleInlineSave(field, updatedTags);
  };

  const handleSaveNewContacto = async () => {
    if (!localNombre.trim()) {
      setCreateError('El nombre completo del contacto es obligatorio.');
      return;
    }
    if (!localEmpresaId) {
      setCreateError('Debes seleccionar la empresa a la que pertenece el contacto.');
      return;
    }
    if (duplicateContacto) {
      setCreateError(`Ya existe un contacto con estos datos: "${duplicateContacto.nombre}".`);
      return;
    }

    setCreateError(null);
    setIsSavingNew(true);
    try {
      const newContactData: Omit<Contacto, 'id'> = {
        nombre: localNombre.trim(),
        empresaId: localEmpresaId,
        cargo: localCargo.trim(),
        reportaA: localReportaA || null,
        telefono: localTelefono.trim(),
        email: localEmail.trim(),
        linkedin: localLinkedin.trim(),
        foto: localFoto.trim(),
        notas: localNotas.trim(),
        estado: localEstado,
        motivoInactivo: localEstado === 'inactivo' ? localMotivoInactivo.trim() : '',
        empresaConocido: localEmpresaConocido,
        empresasAnteriores: localEmpresasAnteriores,
        intereses: localIntereses,
        empresaIds: localEmpresaIds,
        fecha_creacion: new Date().toISOString(),
      };

      if (onCreateContacto) {
        await onCreateContacto(newContactData);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Error al guardar el contacto.');
    } finally {
      setIsSavingNew(false);
    }
  };

  const generateAiInsights = async () => {
    if (!selectedContacto?.id) return;
    setAiLoading(true);
    setAiError('');
    try {
      const history = interacciones
        .filter((i) => {
          const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
          return ids.includes(selectedContacto.id!);
        })
        .map((i) => ({ date: i.fecha, type: i.tipo, title: i.asunto, desc: i.descripcion }));

      const resp = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'contacto',
          name: localNombre || selectedContacto.nombre,
          details: selectedContacto,
          history,
        }),
      });

      if (!resp.ok) {
        throw new Error('Error al generar informe con IA.');
      }

      const data = await resp.json();
      setAiResponse(data.insights);
    } catch (err: any) {
      setAiError(err.message || 'Error al comunicarse con la IA.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!selectedContacto && !isCreating) return null;

  const contactInteractions = !isCreating && selectedContacto?.id ? interacciones.filter((i) => {
    const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
    return ids.includes(selectedContacto.id!);
  }) : [];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-6 transition-all duration-300"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-indigo-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            {localFoto ? (
              <img
                src={localFoto}
                alt={localNombre || 'Contacto'}
                className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                referrerPolicy="no-referrer"
              />
            ) : !gravatarFailed && gravatarUrl ? (
              <img
                src={gravatarUrl}
                alt={localNombre || 'Contacto'}
                className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                referrerPolicy="no-referrer"
                onError={() => setGravatarFailed(true)}
              />
            ) : (
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-xl font-bold shadow-inner border border-white/20 uppercase">
                {localNombre ? localNombre.slice(0, 2) : <Plus className="w-6 h-6 text-indigo-300" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-50">
                  {isCreating ? (localNombre.trim() || 'Nuevo Contacto') : (localNombre || selectedContacto?.nombre)}
                </h2>
                {isCreating ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    ✨ Nuevo Perfil Completo
                  </span>
                ) : localEstado === 'inactivo' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30">
                    <UserX className="w-3.5 h-3.5" />
                    Inactivo {localMotivoInactivo ? `• ${localMotivoInactivo}` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                    <UserCheck className="w-3 h-3" /> Activo
                  </span>
                )}
              </div>
              <p className="text-sm text-indigo-200 font-medium mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 opacity-80" />
                {localCargo || (isCreating ? 'Rellena todos los campos para dar de alta' : 'Sin cargo definido')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-850 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Action Toolbar for existing contacts */}
          {!isCreating && selectedContacto?.id && (
            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
              <button
                onClick={generateAiInsights}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Obtener Informe de Contacto IA
              </button>
              <button
                onClick={() => {
                  askConfirmation(
                    "¿Eliminar Contacto?",
                    `¿Estás seguro de que deseas eliminar permanentemente al contacto "${localNombre || selectedContacto.nombre}"? Esta acción no se puede deshacer.`,
                    () => {
                      onDeleteContacto(selectedContacto.id!);
                      onClose();
                    }
                  );
                }}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-50 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>
          )}

          {/* AI response display */}
          {aiLoading && (
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl animate-pulse text-sm text-indigo-700 font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-bounce" /> Elaborando perfil de contacto inteligente con Gemini...
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
                <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Perfil y Recomendación de IA
              </h4>
              <div className="prose prose-indigo text-xs whitespace-pre-wrap leading-relaxed">
                {aiResponse}
              </div>
            </div>
          )}

          {/* Duplicate Contact Alert */}
          {duplicateContacto && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-950 text-sm">⚠️ Posible contacto duplicado detectado</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  Ya existe un contacto registrado como <strong>"{duplicateContacto.nombre}"</strong>
                  {duplicateContacto.cargo ? ` (${duplicateContacto.cargo})` : ''}
                  {duplicateContacto.email ? ` • ${duplicateContacto.email}` : ''}
                  {duplicateContacto.telefono ? ` • Tel: ${duplicateContacto.telefono}` : ''}
                  {duplicateContacto.empresaId ? ` en "${empresas.find(e => e.id === duplicateContacto.empresaId)?.nombre || ''}"` : ''}.
                </p>
                {onOpenContacto && duplicateContacto.id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenContacto(duplicateContacto.id!);
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                  >
                    Abrir ficha del contacto existente →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Creation Error Banner */}
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{createError}</span>
            </div>
          )}

          {/* Nombre y Empresa Principal (Bloque Superior Destacado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-indigo-950 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Nombre Completo *
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isCreating ? 'Obligatorio' : 'Se guarda automáticamente'}
                </span>
              </label>
              <input
                type="text"
                required
                value={localNombre}
                onChange={(e) => {
                  setLocalNombre(e.target.value);
                  setCreateError(null);
                  if (!isCreating) handleInlineSave('nombre', e.target.value);
                }}
                onBlur={() => !isCreating && handleBlurSave('nombre', localNombre)}
                placeholder="Ej. Juan Pérez García"
                className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-950 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Empresa Principal *
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isCreating ? 'Obligatorio' : 'Empresa asignada'}
                </span>
              </label>
              <SearchSelect
                placeholder="Escribe para buscar empresa..."
                value={localEmpresaId || ''}
                onChange={(val) => {
                  setLocalEmpresaId(val);
                  setCreateError(null);
                  if (!isCreating) handleInlineSave('empresaId', val);
                }}
                options={empresas.map((e) => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
              />
            </div>
          </div>

          {/* Estado del Contacto & Motivo de Inactividad */}
          <div className={`p-4 rounded-xl border transition-all duration-200 ${
            localEstado === 'inactivo' 
              ? 'bg-amber-50/50 border-amber-200' 
              : 'bg-slate-50/80 border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  {localEstado === 'inactivo' ? (
                    <UserX className="w-4 h-4 text-amber-600" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  Estado del Contacto
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {localEstado === 'inactivo'
                    ? 'Contacto marcado como inactivo (no disponible para gestiones operativas).'
                    : 'Contacto activo y disponible para interacciones comerciales.'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    handleInlineSave('estado', 'activo');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    localEstado !== 'inactivo'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${localEstado !== 'inactivo' ? 'bg-white' : 'bg-slate-300'}`}></span>
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleInlineSave('estado', 'inactivo');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    localEstado === 'inactivo'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${localEstado === 'inactivo' ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
                  Inactivo
                </button>
              </div>
            </div>

            {localEstado === 'inactivo' && (
              <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <span>Motivo de Inactividad</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  {localMotivoInactivo && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalMotivoInactivo('');
                        handleInlineSave('motivoInactivo', '');
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                    >
                      ✕ Borrar motivo
                    </button>
                  )}
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {['Jubilación', 'Cambio de empresa', 'Despido', 'Baja voluntaria', 'Excedencia', 'Fin de contrato'].map((motivo) => {
                    const isSelected = (localMotivoInactivo || '').toLowerCase().trim() === motivo.toLowerCase().trim();
                    return (
                      <button
                        key={motivo}
                        type="button"
                        onClick={() => {
                          setLocalMotivoInactivo(motivo);
                          handleInlineSave('motivoInactivo', motivo);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer font-semibold ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        {motivo}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Motive Input */}
                <input
                  type="text"
                  value={localMotivoInactivo}
                  onChange={(e) => setLocalMotivoInactivo(e.target.value)}
                  onBlur={() => handleBlurSave('motivoInactivo', localMotivoInactivo)}
                  placeholder="O escribe un motivo personalizado (ej. jubilación, cambio de empresa, despido...)"
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            )}
          </div>

          {/* Profile details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cargo / Puesto editable */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  Cargo / Rol / Puesto de Trabajo
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isCreating ? 'Opcional' : 'Se guarda automáticamente'}
                </span>
              </label>
              <input
                type="text"
                value={localCargo}
                onChange={(e) => setLocalCargo(e.target.value)}
                onBlur={() => handleBlurSave('cargo', localCargo)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                placeholder="Ej. Director de Compras, Responsable Comercial, Gerente de Planta..."
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono móvil</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  value={localTelefono}
                  onChange={(e) => {
                    setLocalTelefono(e.target.value);
                    setCreateError(null);
                  }}
                  onBlur={() => handleBlurSave('telefono', localTelefono)}
                  placeholder="Ej. +34 600 000 000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
                {localTelefono && (
                  <div className="flex gap-1">
                    <a
                      href={`tel:${localTelefono}`}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 transition-colors cursor-pointer"
                      title="Llamar directamente"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                    </a>
                    <a
                      href={(() => {
                        const clean = localTelefono.replace(/[^\d]/g, '');
                        const finalPhone =
                          clean.length === 9 && (clean.startsWith('6') || clean.startsWith('7') || clean.startsWith('9'))
                            ? '34' + clean
                            : clean;
                        const hour = new Date().getHours();
                        const saludo = hour < 12 ? 'Buenos\u00A0d\u00EDas' : 'Buenas\u00A0tardes';
                        const firstName = (localNombre || '').trim().split(/\s+/)[0];
                        const text = `${saludo} ${firstName}, `;
                        return `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 transition-colors cursor-pointer"
                      title="Enviar WhatsApp"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.665.988 3.3.15 5.36.15 5.51 0 9.995-4.485 9.999-10 .002-2.673-1.04-5.186-2.935-7.082C17.13 3.328 14.62 2.283 12 2.28 6.49 2.28 2.005 6.765 2.001 12.28c-.002 2.01.523 3.974 1.52 5.711l-.997 3.642 3.734-.98z" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Email personal/profesional</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="email"
                  value={localEmail}
                  onChange={(e) => {
                    setLocalEmail(e.target.value);
                    setCreateError(null);
                  }}
                  onBlur={() => handleBlurSave('email', localEmail)}
                  placeholder="ejemplo@empresa.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
                {localEmail && localEmail.trim() && (
                  <a
                    href={`mailto:${localEmail.trim()}`}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-lg transition-colors flex items-center justify-center cursor-pointer h-[38px] w-[38px] shrink-0"
                    title="Enviar correo electrónico"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Enlace LinkedIn (Perfil)</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  value={localLinkedin}
                  onChange={(e) => setLocalLinkedin(e.target.value)}
                  onBlur={() => handleBlurSave('linkedin', localLinkedin)}
                  placeholder="https://linkedin.com/in/usuario"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
                {localLinkedin && (
                  <a
                    href={
                      localLinkedin.trim().startsWith('http://') || localLinkedin.trim().startsWith('https://')
                        ? localLinkedin.trim()
                        : `https://${localLinkedin.trim()}`
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
                    value={localFoto}
                    onChange={(e) => setLocalFoto(e.target.value)}
                    onBlur={() => handleBlurSave('foto', localFoto)}
                    placeholder="Pega un enlace de foto de LinkedIn o de cualquier web..."
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                  />
                  {localFoto && (
                    <button
                      type="button"
                      onClick={() => handleInlineSave('foto', '')}
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
                              handleInlineSave('foto', reader.result);
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Superior Jerárquico (Reporta A)
              </label>
              <SearchSelect
                placeholder={localEmpresaId ? "Escribe para buscar superior jerárquico..." : "Selecciona primero una empresa"}
                value={localReportaA || ''}
                onChange={(val) => handleInlineSave('reportaA', val || null)}
                options={contactos
                  .filter(
                    (c) =>
                      (isCreating || c.id !== selectedContacto?.id) &&
                      (c.empresaId === localEmpresaId || c.empresaIds?.includes(localEmpresaId))
                  )
                  .map((c) => ({ value: c.id!, label: c.nombre, sublabel: c.cargo || 'Sin cargo' }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Notas y acuerdos del contacto</label>
              <textarea
                value={localNotas}
                onChange={(e) => setLocalNotas(e.target.value)}
                onBlur={() => handleBlurSave('notas', localNotas)}
                rows={3}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none font-medium text-slate-700"
                placeholder="Escribe comentarios, acuerdos, proyectos o notas sobre este contacto..."
              />
            </div>

            {/* Empresa donde trabajaba el usuario al conocer al contacto */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>Empresa donde trabajabas cuando conociste a este contacto</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Asigna en qué empresa tuya trabajabas cuando iniciaste la relación profesional con este contacto.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {localEmpresaConocido.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('empresaConocido', tag)}
                      className="text-indigo-400 hover:text-indigo-900 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEmpresaConocidoInput}
                    onChange={(e) => {
                      setNewEmpresaConocidoInput(e.target.value);
                      setShowEmpresaConocidoSuggestions(true);
                    }}
                    onFocus={() => setShowEmpresaConocidoSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newEmpresaConocidoInput.trim()) {
                          handleAddTag('empresaConocido', newEmpresaConocidoInput.trim());
                          setNewEmpresaConocidoInput('');
                          setShowEmpresaConocidoSuggestions(false);
                        }
                      }
                    }}
                    placeholder="Ej. MiEmpresa Anterior, Consultora X, etc..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:bg-white focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEmpresaConocidoInput.trim()) {
                        handleAddTag('empresaConocido', newEmpresaConocidoInput.trim());
                        setNewEmpresaConocidoInput('');
                        setShowEmpresaConocidoSuggestions(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer border border-indigo-200 transition-colors shrink-0"
                  >
                    + Añadir
                  </button>
                </div>

                {showEmpresaConocidoSuggestions &&
                  newEmpresaConocidoInput.trim().length > 0 &&
                  existingEmpresaConocidoTags.filter(
                    (tag) =>
                      tag.toLowerCase().includes(newEmpresaConocidoInput.toLowerCase()) &&
                      !localEmpresaConocido.includes(tag)
                  ).length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Sugerencias:</div>
                      {existingEmpresaConocidoTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newEmpresaConocidoInput.toLowerCase()) &&
                            !localEmpresaConocido.includes(tag)
                        )
                        .map((tag) => (
                          <div
                            key={tag}
                            onClick={() => {
                              handleAddTag('empresaConocido', tag);
                              setNewEmpresaConocidoInput('');
                              setShowEmpresaConocidoSuggestions(false);
                            }}
                            className="px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>{tag}</span>
                            <span className="text-[10px] text-slate-400 font-medium">+ Añadir</span>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Empresas anteriores */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>Empresas anteriores del contacto</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Añade empresas o puestos previos para mantener su trayectoria profesional completa.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {localEmpresasAnteriores.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('empresasAnteriores', tag)}
                      className="text-indigo-400 hover:text-indigo-900 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEmpresasAnterioresInput}
                    onChange={(e) => {
                      setNewEmpresasAnterioresInput(e.target.value);
                      setShowEmpresasAnterioresSuggestions(true);
                    }}
                    onFocus={() => setShowEmpresasAnterioresSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newEmpresasAnterioresInput.trim()) {
                          handleAddTag('empresasAnteriores', newEmpresasAnterioresInput.trim());
                          setNewEmpresasAnterioresInput('');
                          setShowEmpresasAnterioresSuggestions(false);
                        }
                      }
                    }}
                    placeholder="Ej. Renault, Siemens, Telefónica..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:bg-white focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEmpresasAnterioresInput.trim()) {
                        handleAddTag('empresasAnteriores', newEmpresasAnterioresInput.trim());
                        setNewEmpresasAnterioresInput('');
                        setShowEmpresasAnterioresSuggestions(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer border border-indigo-200 transition-colors shrink-0"
                  >
                    + Añadir
                  </button>
                </div>

                {showEmpresasAnterioresSuggestions &&
                  newEmpresasAnterioresInput.trim().length > 0 &&
                  existingEmpresasAnterioresTags.filter(
                    (tag) =>
                      tag.toLowerCase().includes(newEmpresasAnterioresInput.toLowerCase()) &&
                      !localEmpresasAnteriores.includes(tag)
                  ).length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Sugerencias:</div>
                      {existingEmpresasAnterioresTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newEmpresasAnterioresInput.toLowerCase()) &&
                            !localEmpresasAnteriores.includes(tag)
                        )
                        .map((tag) => (
                          <div
                            key={tag}
                            onClick={() => {
                              handleAddTag('empresasAnteriores', tag);
                              setNewEmpresasAnterioresInput('');
                              setShowEmpresasAnterioresSuggestions(false);
                            }}
                            className="px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>{tag}</span>
                            <span className="text-[10px] text-slate-400 font-medium">+ Añadir</span>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Intereses del contacto */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>Intereses / Hobbies / Especialidades del contacto</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Temas de conversación, aficiones, deportes o intereses profesionales para conectar mejor.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {localIntereses.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-200"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('intereses', tag)}
                      className="text-indigo-400 hover:text-indigo-900 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newInteresesInput}
                    onChange={(e) => {
                      setNewInteresesInput(e.target.value);
                      setShowInteresesSuggestions(true);
                    }}
                    onFocus={() => setShowInteresesSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newInteresesInput.trim()) {
                          handleAddTag('intereses', newInteresesInput.trim());
                          setNewInteresesInput('');
                          setShowInteresesSuggestions(false);
                        }
                      }
                    }}
                    placeholder="Ej. Golf, Ciclismo, Energías Renovables, IA..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:bg-white focus:border-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newInteresesInput.trim()) {
                        handleAddTag('intereses', newInteresesInput.trim());
                        setNewInteresesInput('');
                        setShowInteresesSuggestions(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer border border-indigo-200 transition-colors shrink-0"
                  >
                    + Añadir
                  </button>
                </div>

                {showInteresesSuggestions &&
                  newInteresesInput.trim().length > 0 &&
                  existingInteresesTags.filter(
                    (tag) =>
                      tag.toLowerCase().includes(newInteresesInput.toLowerCase()) &&
                      !localIntereses.includes(tag)
                  ).length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 max-h-40 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Sugerencias:</div>
                      {existingInteresesTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newInteresesInput.toLowerCase()) &&
                            !localIntereses.includes(tag)
                        )
                        .map((tag) => (
                          <div
                            key={tag}
                            onClick={() => {
                              handleAddTag('intereses', tag);
                              setNewInteresesInput('');
                              setShowInteresesSuggestions(false);
                            }}
                            className="px-2 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <span>{tag}</span>
                            <span className="text-[10px] text-slate-400 font-medium">+ Añadir</span>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Empresa(s) para las que trabaja */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center gap-1.5">
                🏢 Empresa(s) para las que trabaja
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Empresa Principal
                  </label>
                  <SearchSelect
                    placeholder="Escribe para buscar empresa..."
                    value={localEmpresaId || ''}
                    onChange={(val) => handleInlineSave('empresaId', val)}
                    options={empresas.map((e) => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                  />
                  {localEmpresaId && (() => {
                    const emp = empresas.find((e) => e.id === localEmpresaId);
                    if (!emp) return null;
                    return (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => onOpenEmpresa?.(emp.id!)}
                          className="w-full text-left p-2.5 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all flex items-center justify-between cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm shrink-0">🏢</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                                {emp.nombre}
                              </p>
                              <p className="text-[10px] text-slate-400 capitalize truncate">
                                {emp.ciudad || 'Sin ciudad'} • {emp.tipo}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-800 transition-all shrink-0 flex items-center gap-0.5 bg-indigo-50 px-2 py-1 rounded-lg">
                            Ver Ficha →
                          </span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Otras Empresas Vinculadas
                  </label>
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5 border border-slate-200 rounded-lg bg-white p-2 min-h-[36px] items-center">
                      {empresas
                        .filter(
                          (e) =>
                            localEmpresaIds.includes(e.id!) && e.id !== localEmpresaId
                        )
                        .map((e) => (
                          <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 bg-indigo-50/60 hover:bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-indigo-150 transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => onOpenEmpresa?.(e.id!)}
                              className="hover:underline text-left cursor-pointer font-bold flex items-center gap-1"
                              title={`Ver ficha de ${e.nombre}`}
                            >
                              <span>🏢 {e.nombre}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedIds = localEmpresaIds.filter((id) => id !== e.id);
                                handleInlineSave('empresaIds', updatedIds);
                              }}
                              className="text-indigo-400 hover:text-rose-600 font-bold ml-0.5 transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      {empresas.filter(
                        (e) =>
                          localEmpresaIds.includes(e.id!) && e.id !== localEmpresaId
                      ).length === 0 && (
                        <span className="text-[10px] text-slate-400 p-0.5 italic">
                          Sin otras empresas vinculadas
                        </span>
                      )}
                    </div>

                    <SearchSelect
                      placeholder="+ Vincular otra empresa..."
                      value=""
                      onChange={(val) => {
                        if (!val) return;
                        if (!localEmpresaIds.includes(val)) {
                          handleInlineSave('empresaIds', [...localEmpresaIds, val]);
                        }
                      }}
                      options={empresas
                        .filter(
                          (e) =>
                            e.id !== localEmpresaId &&
                            !localEmpresaIds.includes(e.id!)
                        )
                        .map((e) => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de Interacciones (solo para contactos existentes) */}
            {!isCreating && selectedContacto?.id && (
              <div className="md:col-span-2 border-t border-slate-100 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800 text-sm">Historial de Interacciones</h4>
                  <button
                    onClick={() => setShowAddInterFormCont(!showAddInterFormCont)}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    {showAddInterFormCont ? '✕ Cancelar' : '+ Nueva Interacción'}
                  </button>
                </div>

                {showAddInterFormCont && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newInterFormCont.asunto) return;
                      const companyIds = localEmpresaId ? [localEmpresaId] : [];
                      await onUpdateInteraccion({
                        asunto: newInterFormCont.asunto,
                        tipo: newInterFormCont.tipo,
                        fecha: newInterFormCont.fecha,
                        descripcion: newInterFormCont.descripcion,
                        contactoId: selectedContacto.id!,
                        contactoIds: [selectedContacto.id!],
                        empresaIds: companyIds,
                        estado: newInterFormCont.estado,
                        pasos: [],
                      });
                      setShowAddInterFormCont(false);
                      setNewInterFormCont({
                        asunto: '',
                        tipo: 'reunion',
                        fecha: new Date().toISOString().slice(0, 10),
                        descripcion: '',
                        estado: 'pendiente',
                      });
                    }}
                    className="mb-4 bg-indigo-50/50 p-4 rounded-xl space-y-3 border border-indigo-100"
                  >
                    <h5 className="text-xs font-bold text-indigo-900 uppercase">
                      Crear Nueva Interacción para {localNombre || selectedContacto.nombre}
                    </h5>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">Asunto *</label>
                      <input
                        type="text"
                        required
                        value={newInterFormCont.asunto}
                        onChange={(e) =>
                          setNewInterFormCont({ ...newInterFormCont, asunto: e.target.value })
                        }
                        className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">Tipo</label>
                        <select
                          value={newInterFormCont.tipo}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, tipo: e.target.value as any })
                          }
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs"
                        >
                          <option value="reunion">Reunión</option>
                          <option value="llamada">Llamada</option>
                          <option value="email">Email</option>
                          <option value="feria">Feria</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">Fecha</label>
                        <input
                          type="date"
                          value={newInterFormCont.fecha}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, fecha: e.target.value })
                          }
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase">Estado inicial</label>
                        <select
                          value={newInterFormCont.estado}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, estado: e.target.value as any })
                          }
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-bold"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="completada">Completada</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase">Notas</label>
                      <textarea
                        value={newInterFormCont.descripcion}
                        onChange={(e) =>
                          setNewInterFormCont({ ...newInterFormCont, descripcion: e.target.value })
                        }
                        rows={2}
                        className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddInterFormCont(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Guardar Interacción
                      </button>
                    </div>
                  </form>
                )}

                {contactInteractions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay interacciones registradas con este contacto.</p>
                ) : (
                  <div className="space-y-3">
                    {contactInteractions
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((i) => {
                        const isCompletada = i.estado === 'completada';
                        return (
                          <div
                            key={i.id}
                            onClick={() => onOpenInteraccion?.(i.id!)}
                            className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200/80 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {i.asunto}
                              </span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCompletada
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isCompletada ? 'Completada' : 'Pendiente'}
                                </span>
                                <span className="text-[11px] text-slate-400">{i.fecha}</span>
                              </div>
                            </div>
                            <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded mb-1">
                              {i.tipo}
                            </span>
                            {i.descripcion && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                {i.descripcion}
                              </p>
                            )}
                            {i.resolucion && (
                              <div className="mt-2 p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs text-emerald-950">
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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {isCreating ? (
            <>
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                Todos los datos se guardarán conjuntamente en el nuevo contacto.
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewContacto}
                  disabled={isSavingNew || !localNombre.trim() || !localEmpresaId || !!duplicateContacto}
                  title={duplicateContacto ? 'Ya existe un contacto con estos datos' : undefined}
                  className={`px-5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                    isSavingNew || !localNombre.trim() || !localEmpresaId || !!duplicateContacto
                      ? 'bg-slate-300 cursor-not-allowed opacity-75'
                      : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-md'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {isSavingNew ? 'Guardando...' : duplicateContacto ? 'Contacto Duplicado' : 'Guardar Contacto'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

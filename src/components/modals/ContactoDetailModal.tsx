/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Trash2, Phone, Mail, ExternalLink, Sparkles, AlertCircle, Plus, Tag 
} from 'lucide-react';
import md5 from 'blueimp-md5';
import { Contacto, Empresa, Interaccion } from '../../types';
import { SearchSelect } from '../SearchSelect';

export interface ContactoDetailModalProps {
  selectedContacto: Contacto | null;
  onClose: () => void;
  empresas: Empresa[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  onUpdateContacto: (cont: Contacto) => Promise<void>;
  onDeleteContacto: (id: string) => Promise<void>;
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  onOpenEmpresa?: (id: string) => void;
  onOpenInteraccion?: (id: string) => void;
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
  onClose,
  empresas,
  contactos,
  interacciones,
  onUpdateContacto,
  onDeleteContacto,
  onUpdateInteraccion,
  onOpenEmpresa,
  onOpenInteraccion,
  askConfirmation,
}) => {
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState('');

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

  useEffect(() => {
    setGravatarFailed(false);
    setAiResponse(null);
    setAiError('');
    setShowAddInterFormCont(false);
  }, [selectedContacto?.id, selectedContacto?.email]);

  const gravatarUrl = useMemo(() => {
    if (!selectedContacto?.email || !selectedContacto.email.trim()) return null;
    const hash = md5(selectedContacto.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=150&d=404`;
  }, [selectedContacto?.email]);

  const handleInlineSave = async (field: string, value: any) => {
    if (!selectedContacto) return;
    const updated = { ...selectedContacto, [field]: value };
    await onUpdateContacto(updated);
  };

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
    if (!selectedContacto) return;
    const trimmed = tag.trim();
    if (!trimmed) return;

    let currentTags: string[] = [];
    const rawVal = selectedContacto[field];
    if (Array.isArray(rawVal)) {
      currentTags = [...rawVal];
    } else if (typeof rawVal === 'string' && (rawVal as string).trim()) {
      currentTags = [(rawVal as string).trim()];
    }

    if (currentTags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) return;

    await handleInlineSave(field, [...currentTags, trimmed]);
  };

  const handleRemoveTag = async (
    field: 'empresaConocido' | 'empresasAnteriores' | 'intereses',
    tag: string
  ) => {
    if (!selectedContacto) return;
    let currentTags: string[] = [];
    const rawVal = selectedContacto[field];
    if (Array.isArray(rawVal)) {
      currentTags = [...rawVal];
    } else if (typeof rawVal === 'string' && (rawVal as string).trim()) {
      currentTags = [(rawVal as string).trim()];
    }

    await handleInlineSave(
      field,
      currentTags.filter((t) => t !== tag)
    );
  };

  const generateAiInsights = async () => {
    if (!selectedContacto) return;
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
          name: selectedContacto.nombre,
          details: selectedContacto,
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

  if (!selectedContacto) return null;

  const contactInteractions = interacciones.filter((i) => {
    const ids = i.contactoIds?.length ? i.contactoIds : (i.contactoId ? [i.contactoId] : []);
    return ids.includes(selectedContacto.id!);
  });

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
        <div className="p-6 bg-indigo-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-4">
            {selectedContacto.foto ? (
              <img
                src={selectedContacto.foto}
                alt={selectedContacto.nombre}
                className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                referrerPolicy="no-referrer"
              />
            ) : !gravatarFailed && gravatarUrl ? (
              <img
                src={gravatarUrl}
                alt={selectedContacto.nombre}
                className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white/20"
                referrerPolicy="no-referrer"
                onError={() => setGravatarFailed(true)}
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
          <button
            onClick={onClose}
            className="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-850 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
                  `¿Estás seguro de que deseas eliminar permanentemente al contacto "${selectedContacto.nombre}"? Esta acción no se puede deshacer.`,
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

          {/* Profile details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">Teléfono móvil</label>
              <div className="mt-1 flex gap-1">
                <input
                  type="text"
                  value={selectedContacto.telefono || ''}
                  onChange={(e) => handleInlineSave('telefono', e.target.value)}
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
                        const finalPhone =
                          clean.length === 9 && (clean.startsWith('6') || clean.startsWith('7') || clean.startsWith('9'))
                            ? '34' + clean
                            : clean;
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
                  value={selectedContacto.email || ''}
                  onChange={(e) => handleInlineSave('email', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
                {selectedContacto.email && selectedContacto.email.trim() && (
                  <a
                    href={`mailto:${selectedContacto.email.trim()}`}
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
                  value={selectedContacto.linkedin || ''}
                  onChange={(e) => handleInlineSave('linkedin', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
                {selectedContacto.linkedin && (
                  <a
                    href={
                      selectedContacto.linkedin.trim().startsWith('http://') ||
                      selectedContacto.linkedin.trim().startsWith('https://')
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
                    onChange={(e) => handleInlineSave('foto', e.target.value)}
                    placeholder="Pega un enlace de foto de LinkedIn o de cualquier web..."
                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                  />
                  {selectedContacto.foto && (
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
                placeholder="Escribe para buscar superior jerárquico..."
                value={selectedContacto.reportaA || ''}
                onChange={(val) => handleInlineSave('reportaA', val || null)}
                options={contactos
                  .filter(
                    (c) =>
                      c.id !== selectedContacto.id &&
                      (c.empresaId === selectedContacto.empresaId ||
                        c.empresaIds?.includes(selectedContacto.empresaId))
                  )
                  .map((c) => ({ value: c.id!, label: c.nombre, sublabel: c.cargo || 'Sin cargo' }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Notas del contacto</label>
              <textarea
                value={selectedContacto.notas || ''}
                onChange={(e) => handleInlineSave('notas', e.target.value)}
                rows={3}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none font-medium text-slate-700"
                placeholder="Escribe comentarios o notas sobre este contacto..."
              />
            </div>

            {/* Empresa donde trabajaba el usuario al conocer al contacto */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                💼 Empresa donde trabajaba el usuario al conocer al contacto
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50">
                {(() => {
                  const val = selectedContacto.empresaConocido;
                  const tags = Array.isArray(val)
                    ? val
                    : val && (val as string).trim()
                    ? [(val as string).trim()]
                    : [];
                  return tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-750 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:border-slate-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag('empresaConocido', tag)}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-1 transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ));
                })()}
                <div className="relative flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Escribir empresa..."
                    value={newEmpresaConocidoInput}
                    onChange={(e) => {
                      setNewEmpresaConocidoInput(e.target.value);
                      setShowEmpresaConocidoSuggestions(true);
                    }}
                    onFocus={() => setShowEmpresaConocidoSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEmpresaConocidoSuggestions(false), 200)}
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
                    className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs outline-none focus:border-indigo-500 transition-all w-36 font-medium"
                  />
                  {showEmpresaConocidoSuggestions && newEmpresaConocidoInput.trim() && (
                    <div className="absolute left-0 bottom-full mb-1 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 overflow-hidden max-h-48 overflow-y-auto">
                      {!existingEmpresaConocidoTags.some(
                        (t) => t.toLowerCase() === newEmpresaConocidoInput.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={() => {
                            handleAddTag('empresaConocido', newEmpresaConocidoInput.trim());
                            setNewEmpresaConocidoInput('');
                            setShowEmpresaConocidoSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear nuevo: "{newEmpresaConocidoInput.trim()}"</span>
                        </button>
                      )}
                      {existingEmpresaConocidoTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newEmpresaConocidoInput.trim().toLowerCase()) &&
                            !(Array.isArray(selectedContacto.empresaConocido)
                              ? selectedContacto.empresaConocido
                              : selectedContacto.empresaConocido
                              ? [selectedContacto.empresaConocido]
                              : []
                            ).includes(tag)
                        )
                        .map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => {
                              handleAddTag('empresaConocido', tag);
                              setNewEmpresaConocidoInput('');
                              setShowEmpresaConocidoSuggestions(false);
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

            {/* Empresas anteriores */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                🏢 Empresas anteriores donde trabajó el contacto
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50">
                {(selectedContacto.empresasAnteriores || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-750 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:border-slate-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('empresasAnteriores', tag)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-1 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <div className="relative flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Escribir empresa..."
                    value={newEmpresasAnterioresInput}
                    onChange={(e) => {
                      setNewEmpresasAnterioresInput(e.target.value);
                      setShowEmpresasAnterioresSuggestions(true);
                    }}
                    onFocus={() => setShowEmpresasAnterioresSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEmpresasAnterioresSuggestions(false), 200)}
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
                    className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs outline-none focus:border-indigo-500 transition-all w-36 font-medium"
                  />
                  {showEmpresasAnterioresSuggestions && newEmpresasAnterioresInput.trim() && (
                    <div className="absolute left-0 bottom-full mb-1 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 overflow-hidden max-h-48 overflow-y-auto">
                      {!existingEmpresasAnterioresTags.some(
                        (t) => t.toLowerCase() === newEmpresasAnterioresInput.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={() => {
                            handleAddTag('empresasAnteriores', newEmpresasAnterioresInput.trim());
                            setNewEmpresasAnterioresInput('');
                            setShowEmpresasAnterioresSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear nuevo: "{newEmpresasAnterioresInput.trim()}"</span>
                        </button>
                      )}
                      {existingEmpresasAnterioresTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newEmpresasAnterioresInput.trim().toLowerCase()) &&
                            !(selectedContacto.empresasAnteriores || []).includes(tag)
                        )
                        .map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => {
                              handleAddTag('empresasAnteriores', tag);
                              setNewEmpresasAnterioresInput('');
                              setShowEmpresasAnterioresSuggestions(false);
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

            {/* Intereses del contacto */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                ⚽ Intereses del contacto (Networking, hobbies, deportes, cine...)
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 border border-slate-200 rounded-xl bg-slate-50">
                {(selectedContacto.intereses || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-750 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:border-slate-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag('intereses', tag)}
                      className="text-slate-400 hover:text-rose-600 font-bold ml-1 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <div className="relative flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Escribir interés..."
                    value={newInteresesInput}
                    onChange={(e) => {
                      setNewInteresesInput(e.target.value);
                      setShowInteresesSuggestions(true);
                    }}
                    onFocus={() => setShowInteresesSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowInteresesSuggestions(false), 200)}
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
                    className="bg-white border border-slate-200 rounded-full px-3 py-1 text-xs outline-none focus:border-indigo-500 transition-all w-36 font-medium"
                  />
                  {showInteresesSuggestions && newInteresesInput.trim() && (
                    <div className="absolute left-0 bottom-full mb-1 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50 overflow-hidden max-h-48 overflow-y-auto">
                      {!existingInteresesTags.some(
                        (t) => t.toLowerCase() === newInteresesInput.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={() => {
                            handleAddTag('intereses', newInteresesInput.trim());
                            setNewInteresesInput('');
                            setShowInteresesSuggestions(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear nuevo: "{newInteresesInput.trim()}"</span>
                        </button>
                      )}
                      {existingInteresesTags
                        .filter(
                          (tag) =>
                            tag.toLowerCase().includes(newInteresesInput.trim().toLowerCase()) &&
                            !(selectedContacto.intereses || []).includes(tag)
                        )
                        .map((tag, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseDown={() => {
                              handleAddTag('intereses', tag);
                              setNewInteresesInput('');
                              setShowInteresesSuggestions(false);
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
                    value={selectedContacto.empresaId || ''}
                    onChange={(val) => handleInlineSave('empresaId', val)}
                    options={empresas.map((e) => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                  />
                  {selectedContacto.empresaId && (() => {
                    const emp = empresas.find((e) => e.id === selectedContacto.empresaId);
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
                            selectedContacto.empresaIds?.includes(e.id!) && e.id !== selectedContacto.empresaId
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
                                const currentIds = selectedContacto.empresaIds || [];
                                const updatedIds = currentIds.filter((id) => id !== e.id);
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
                          selectedContacto.empresaIds?.includes(e.id!) && e.id !== selectedContacto.empresaId
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
                        const currentIds = selectedContacto.empresaIds || [];
                        if (!currentIds.includes(val)) {
                          handleInlineSave('empresaIds', [...currentIds, val]);
                        }
                      }}
                      options={empresas
                        .filter(
                          (e) =>
                            e.id !== selectedContacto.empresaId &&
                            !(selectedContacto.empresaIds || []).includes(e.id!)
                        )
                        .map((e) => ({ value: e.id!, label: e.nombre, sublabel: e.tipo }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Historial de Interacciones */}
            <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
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
                  Muestra todas las reuniones, llamadas, correos o ferias asociadas a este contacto.
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
                        resolucion: '',
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
                    className="mb-4 bg-indigo-50/40 border border-indigo-100 p-4 rounded-xl space-y-3 shadow-sm"
                  >
                    <h5 className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">
                      Crear Nueva Interacción para {selectedContacto.nombre}
                    </h5>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Asunto / Título *
                      </label>
                      <input
                        type="text"
                        required
                        value={newInterFormCont.asunto}
                        onChange={(e) =>
                          setNewInterFormCont({ ...newInterFormCont, asunto: e.target.value })
                        }
                        className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:border-indigo-500 outline-none transition-all"
                        placeholder="Ej. Reunión de seguimiento o llamada de tarifas"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                        <select
                          value={newInterFormCont.tipo}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, tipo: e.target.value as any })
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
                          value={newInterFormCont.fecha}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, fecha: e.target.value })
                          }
                          className="mt-1 w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Estado inicial
                        </label>
                        <select
                          value={newInterFormCont.estado}
                          onChange={(e) =>
                            setNewInterFormCont({ ...newInterFormCont, estado: e.target.value as any })
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
                        Descripción / Detalles
                      </label>
                      <textarea
                        value={newInterFormCont.descripcion}
                        onChange={(e) =>
                          setNewInterFormCont({ ...newInterFormCont, descripcion: e.target.value })
                        }
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
                    <p className="text-xs text-slate-500 font-medium">
                      No se han registrado interacciones con este contacto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {contactInteractions
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
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 pl-4">
                              {i.descripcion || 'Sin descripción'}
                            </p>
                            {i.resolucion && (
                              <div className="text-[10px] text-emerald-700 bg-emerald-50/50 rounded p-1.5 mt-1.5 pl-4 border-l-2 border-emerald-400 font-medium">
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Pencil, Plus } from 'lucide-react';
import { Interaccion, Contacto, Empresa, PasoInteraccion } from '../../types';
import { SearchSelect } from '../SearchSelect';

export interface InteraccionDetailModalProps {
  selectedInteraccion: Interaccion | null;
  onClose: () => void;
  empresas: Empresa[];
  contactos: Contacto[];
  onUpdateInteraccion: (inter: Interaccion) => Promise<void>;
  onDeleteInteraccion: (id: string) => Promise<void>;
  onOpenContacto?: (id: string) => void;
  onOpenEmpresa?: (id: string) => void;
  askConfirmation: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    isDestructive?: boolean,
    confirmLabel?: string,
    cancelLabel?: string
  ) => void;
}

const obtenerFechaLimiteDefecto = (pasos?: PasoInteraccion[]) => {
  if (!pasos || pasos.length === 0) return '';
  const fechas = pasos
    .map((p) => p.fecha)
    .filter((f): f is string => typeof f === 'string' && f.trim() !== '');
  if (fechas.length === 0) return '';
  return fechas.reduce((max, current) => (current > max ? current : max), fechas[0]);
};

export const InteraccionDetailModal: React.FC<InteraccionDetailModalProps> = ({
  selectedInteraccion,
  onClose,
  empresas,
  contactos,
  onUpdateInteraccion,
  onDeleteInteraccion,
  onOpenContacto,
  onOpenEmpresa,
  askConfirmation,
}) => {
  // Local buffering for textareas to prevent typing lag
  const [localDescripcion, setLocalDescripcion] = useState('');
  const [localResolucion, setLocalResolucion] = useState('');

  // States for editing interaction steps
  const [editingPasoIndex, setEditingPasoIndex] = useState<number | null>(null);
  const [editingPasoText, setEditingPasoText] = useState('');
  const [editingPasoDate, setEditingPasoDate] = useState('');

  // Inline new step
  const [newStepText, setNewStepText] = useState('');
  const [newStepDate, setNewStepDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (selectedInteraccion) {
      setLocalDescripcion(selectedInteraccion.descripcion || '');
      setLocalResolucion(selectedInteraccion.resolucion || '');
    } else {
      setLocalDescripcion('');
      setLocalResolucion('');
    }
  }, [selectedInteraccion?.id]);

  if (!selectedInteraccion) return null;

  const actualizarInteraccion = (campos: Partial<Interaccion>) => {
    onUpdateInteraccion({
      ...selectedInteraccion,
      ...campos,
      descripcion: localDescripcion,
      resolucion: localResolucion,
    });
  };

  const handleCloseConGuardado = () => {
    const isDescChanged = localDescripcion !== selectedInteraccion.descripcion;
    const isResChanged = localResolucion !== (selectedInteraccion.resolucion || '');
    if (isDescChanged || isResChanged) {
      onUpdateInteraccion({
        ...selectedInteraccion,
        descripcion: localDescripcion,
        resolucion: localResolucion,
      });
    }
    onClose();
  };

  const actualizarPasosYFechaLimite = (nuevosPasos: PasoInteraccion[]) => {
    const oldMaxDate = obtenerFechaLimiteDefecto(selectedInteraccion.pasos || []);
    const newMaxDate = obtenerFechaLimiteDefecto(nuevosPasos);
    const currentFechaLimite = selectedInteraccion.fechaLimite;

    let nuevaFechaLimite = currentFechaLimite;
    if (!currentFechaLimite || currentFechaLimite === oldMaxDate) {
      nuevaFechaLimite = newMaxDate || null;
    }

    actualizarInteraccion({
      pasos: nuevosPasos,
      fechaLimite: nuevaFechaLimite,
    });
  };

  const participantIds = Array.from(
    new Set([
      ...(selectedInteraccion.contactoId ? [selectedInteraccion.contactoId] : []),
      ...(selectedInteraccion.contactoIds || []),
    ])
  ).filter(Boolean);

  const participantesList = contactos.filter((c) => c.id && participantIds.includes(c.id));

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300"
      onClick={handleCloseConGuardado}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-amber-600 text-white flex items-start justify-between">
          <div>
            <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">
              {selectedInteraccion.tipo}
            </span>
            <h2 className="text-2xl font-bold mt-1 text-slate-50">{selectedInteraccion.asunto}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  selectedInteraccion.estado === 'completada'
                    ? 'bg-emerald-500/20 text-white'
                    : 'bg-rose-500/20 text-white animate-pulse'
                }`}
              >
                {selectedInteraccion.estado}
              </span>
              <span className="text-xs text-amber-100">Fecha: {selectedInteraccion.fecha}</span>
            </div>
          </div>
          <button
            onClick={handleCloseConGuardado}
            className="p-2 text-amber-100 hover:text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
          >
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
                    onClose();
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
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Detalle o Minuta de la Interacción
              </label>
              <textarea
                value={localDescripcion}
                onChange={(e) => setLocalDescripcion(e.target.value)}
                onBlur={() => {
                  if (localDescripcion !== selectedInteraccion.descripcion) {
                    actualizarInteraccion({ descripcion: localDescripcion });
                  }
                }}
                rows={4}
                className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                ⏰ Fecha Límite de Resolución
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="date"
                  value={selectedInteraccion.fechaLimite || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    actualizarInteraccion({ fechaLimite: val });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                />
                {selectedInteraccion.pasos && selectedInteraccion.pasos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const defDate = obtenerFechaLimiteDefecto(selectedInteraccion.pasos);
                      if (defDate) {
                        actualizarInteraccion({ fechaLimite: defDate });
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-150 transition-colors shrink-0 cursor-pointer"
                    title="Sincronizar con el plazo más largo de los pasos o compromisos"
                  >
                    Calcular de Pasos
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Por defecto se sincroniza al plazo más largo de los pasos o compromisos. Puedes cambiarla libremente.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase">
                Resolución / Conclusión final
              </label>
              <textarea
                value={localResolucion}
                onChange={(e) => setLocalResolucion(e.target.value)}
                onBlur={() => {
                  if (localResolucion !== (selectedInteraccion.resolucion || '')) {
                    actualizarInteraccion({ resolucion: localResolucion });
                  }
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

              <div className="space-y-3">
                <div className="space-y-2">
                  {participantesList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No hay participantes registrados para esta interacción.</p>
                  ) : (
                    participantesList.map((cont) => {
                      const empresaPrincipal = empresas.find((e) => e.id === cont.empresaId);
                      const otrasEmpresas = empresas.filter(
                        (e) => cont.empresaIds?.includes(e.id!) && e.id !== cont.empresaId
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
                                onClick={() => onOpenContacto?.(cont.id!)}
                                className="font-semibold text-slate-800 text-xs sm:text-sm hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {cont.nombre}
                              </p>
                              <p className="text-[11px] text-slate-500">{cont.cargo || 'Sin cargo'}</p>

                              {/* Companies list */}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {empresaPrincipal && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEmpresa?.(empresaPrincipal.id!)}
                                    className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded font-semibold border border-indigo-150 transition-all cursor-pointer"
                                    title={`Ver ficha de ${empresaPrincipal.nombre}`}
                                  >
                                    🏢 {empresaPrincipal.nombre}
                                  </button>
                                )}
                                {otrasEmpresas.map((e) => (
                                  <button
                                    key={e.id}
                                    type="button"
                                    onClick={() => onOpenEmpresa?.(e.id!)}
                                    className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-250 transition-all cursor-pointer"
                                    title={`Ver ficha de ${e.nombre}`}
                                  >
                                    🏢 {e.nombre}
                                  </button>
                                ))}
                                {!empresaPrincipal && otrasEmpresas.length === 0 && (
                                  <span className="text-[10px] text-slate-400">Sin empresa vinculada</span>
                                )}
                              </div>
                            </div>
                          </div>

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
                                  const updatedContactoIds = participantIds.filter((id) => id !== cont.id);
                                  const updatedCompanies = Array.from(
                                    new Set(
                                      contactos
                                        .filter((c) => c.id && updatedContactoIds.includes(c.id))
                                        .map((c) => c.empresaId)
                                        .filter(Boolean)
                                    )
                                  );

                                  const updatedInter = {
                                    ...selectedInteraccion,
                                    contactoId: updatedContactoIds[0],
                                    contactoIds: updatedContactoIds,
                                    empresaIds: updatedCompanies,
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

                {/* Add participant selector */}
                <div className="flex flex-col gap-2 mt-2 bg-slate-50/50 p-2 rounded-xl border border-slate-150">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Añadir participante:</label>
                  <SearchSelect
                    placeholder="Escribe para buscar y añadir participante..."
                    value=""
                    onChange={(val) => {
                      if (!val) return;
                      if (participantIds.includes(val)) return;

                      const updatedContactoIds = [...participantIds, val];
                      const updatedCompanies = Array.from(
                        new Set([
                          ...(selectedInteraccion.empresaIds || []),
                          ...contactos
                            .filter((c) => c.id && updatedContactoIds.includes(c.id))
                            .map((c) => c.empresaId)
                            .filter(Boolean),
                        ])
                      );

                      const updatedInter = {
                        ...selectedInteraccion,
                        contactoId: updatedContactoIds[0],
                        contactoIds: updatedContactoIds,
                        empresaIds: updatedCompanies,
                      };
                      onUpdateInteraccion(updatedInter);
                    }}
                    options={contactos
                      .filter((c) => !participantIds.includes(c.id!))
                      .map((c) => {
                        const empName = empresas.find((e) => e.id === c.empresaId)?.nombre || 'Sin empresa';
                        return { value: c.id!, label: c.nombre, sublabel: empName };
                      })}
                  />
                </div>
              </div>
            </div>

            {/* Sub-steps / checklist */}
            <div>
              <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-3">
                📋 Plan de Pasos & Compromisos
              </h4>
              <div className="space-y-2">
                {(selectedInteraccion.pasos || []).map((paso, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 gap-2"
                  >
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
                                fecha: editingPasoDate,
                              };
                              actualizarPasosYFechaLimite(updatedPasos);
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
                              actualizarPasosYFechaLimite(updatedPasos);
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span className="text-sm text-slate-700">{paso.texto}</span>
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
                                  actualizarPasosYFechaLimite(updatedPasos);
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

                {/* Add new step inline */}
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="text"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder="Compromiso o paso a realizar..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500 transition-all"
                  />
                  <input
                    type="date"
                    value={newStepDate}
                    onChange={(e) => setNewStepDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newStepText.trim()) {
                        const steps = [...(selectedInteraccion.pasos || [])];
                        steps.push({ texto: newStepText.trim(), fecha: newStepDate, completado: false });
                        actualizarPasosYFechaLimite(steps);
                        setNewStepText('');
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
              const nuevoEstado = selectedInteraccion.estado === 'pendiente' ? 'completada' : 'pendiente';
              actualizarInteraccion({ estado: nuevoEstado });
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              selectedInteraccion.estado === 'completada'
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            {selectedInteraccion.estado === 'completada' ? 'Reabrir como Pendiente' : '✓ Marcar como Completada'}
          </button>
          <button
            onClick={handleCloseConGuardado}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

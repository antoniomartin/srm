/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Ban, RotateCcw, Clock, Edit2, Check, X, FileText, AlertCircle } from 'lucide-react';
import { NotaItem } from '../types';

export interface NotasManagerProps {
  notasRaw?: string;
  notasHistorial?: NotaItem[];
  onChange: (historial: NotaItem[], serialized: string) => void;
  title?: string;
  placeholder?: string;
  isCreating?: boolean;
}

export function serializeNotasHistorial(items: NotaItem[]): string {
  return items
    .map((item) => {
      const dateStr = new Date(item.fecha).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const prefix = item.anulada ? `[ANULADA ${dateStr}]` : `[${dateStr}]`;
      return `${prefix} ${item.texto}`;
    })
    .join('\n');
}

export function parseNotasToHistorial(rawNotas?: string, existingHistorial?: NotaItem[]): NotaItem[] {
  if (Array.isArray(existingHistorial) && existingHistorial.length > 0) {
    return existingHistorial;
  }
  if (!rawNotas || !rawNotas.trim()) return [];

  const lines = rawNotas.split('\n').map((l) => l.trim()).filter(Boolean);
  const now = new Date().toISOString();

  return lines.map((line, idx) => {
    const anuladaMatch = line.match(/^\[ANULADA(?:\s+([^\]]+))?\]\s*(.*)$/i);
    if (anuladaMatch) {
      return {
        id: `nota-migrated-${idx}-${Date.now()}`,
        texto: anuladaMatch[2] || '',
        fecha: now,
        anulada: true,
      };
    }
    const dateMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (dateMatch) {
      return {
        id: `nota-migrated-${idx}-${Date.now()}`,
        texto: dateMatch[2] || '',
        fecha: now,
        anulada: false,
      };
    }
    return {
      id: `nota-migrated-${idx}-${Date.now()}`,
      texto: line,
      fecha: now,
      anulada: false,
    };
  });
}

export const NotasManager: React.FC<NotasManagerProps> = ({
  notasRaw = '',
  notasHistorial,
  onChange,
  title = 'Notas y Acuerdos Registrados',
  placeholder = 'Escribe una nueva nota o apunte...',
}) => {
  const [items, setItems] = useState<NotaItem[]>(() =>
    parseNotasToHistorial(notasRaw, notasHistorial)
  );
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showAnuladas, setShowAnuladas] = useState(true);

  // Sync internal state if prop updates externally
  useEffect(() => {
    const parsed = parseNotasToHistorial(notasRaw, notasHistorial);
    setItems(parsed);
  }, [notasRaw, notasHistorial]);

  const updateItems = (newItems: NotaItem[]) => {
    setItems(newItems);
    onChange(newItems, serializeNotasHistorial(newItems));
  };

  const handleAddNota = () => {
    if (!newText.trim()) return;
    const now = new Date().toISOString();
    const newNota: NotaItem = {
      id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      texto: newText.trim(),
      fecha: now,
      anulada: false,
    };

    const updated = [newNota, ...items];
    setNewText('');
    updateItems(updated);
  };

  const handleToggleAnular = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        const isAnulada = !item.anulada;
        return {
          ...item,
          anulada: isAnulada,
          fechaAnulacion: isAnulada ? new Date().toISOString() : undefined,
        };
      }
      return item;
    });
    updateItems(updated);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    updateItems(updated);
  };

  const handleStartEdit = (item: NotaItem) => {
    setEditingId(item.id);
    setEditingText(item.texto);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingText.trim()) return;
    const updated = items.map((item) =>
      item.id === id ? { ...item, texto: editingText.trim() } : item
    );
    setEditingId(null);
    setEditingText('');
    updateItems(updated);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const formatFecha = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const activasCount = useMemo(() => items.filter((i) => !i.anulada).length, [items]);
  const anuladasCount = useMemo(() => items.filter((i) => i.anulada).length, [items]);

  const visibleItems = useMemo(() => {
    if (showAnuladas) return items;
    return items.filter((i) => !i.anulada);
  }, [items, showAnuladas]);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <span>📝 {title}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {activasCount} {activasCount === 1 ? 'activa' : 'activas'}
            {anuladasCount > 0 && ` · ${anuladasCount} anulada${anuladasCount > 1 ? 's' : ''}`}
          </span>
        </label>

        {anuladasCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAnuladas((prev) => !prev)}
            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
          >
            {showAnuladas ? 'Ocultar anuladas' : `Mostrar anuladas (${anuladasCount})`}
          </button>
        )}
      </div>

      {/* Input box to add a new note */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-2.5 shadow-2xs space-y-2 focus-within:border-indigo-400 focus-within:bg-white transition-all">
        <textarea
          rows={2}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleAddNota();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none resize-none font-medium leading-relaxed"
        />
        <div className="flex items-center justify-between border-t border-slate-150 pt-2">
          <span className="text-[10px] text-slate-400 font-medium">
            Fecha de registro automática: <strong className="text-slate-600">{formatFecha(new Date().toISOString())}</strong>
          </span>
          <button
            type="button"
            onClick={handleAddNota}
            disabled={!newText.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Nota</span>
          </button>
        </div>
      </div>

      {/* Notes list */}
      {visibleItems.length === 0 ? (
        <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-xs text-slate-400 italic">No hay notas registradas todavía.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const isEditing = editingId === item.id;
            const isAnulada = !!item.anulada;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2 ${
                  isAnulada
                    ? 'bg-slate-50/70 border-slate-200/80 text-slate-400 border-l-4 border-l-slate-300'
                    : 'bg-white border-slate-200 text-slate-700 border-l-4 border-l-indigo-500 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Top row: Date & status badges + action buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatFecha(item.fecha)}
                    </span>
                    {isAnulada && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">
                        <Ban className="w-3 h-3" /> Anulada
                        {item.fechaAnulacion && ` (${formatFecha(item.fechaAnulacion)})`}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          title="Guardar edición"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                          title="Cancelar edición"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {!isAnulada && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                            title="Editar texto de la nota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleAnular(item.id)}
                          className={`p-1 rounded cursor-pointer transition-colors ${
                            isAnulada
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={isAnulada ? 'Desanular / Reactivar nota' : 'Anular nota'}
                        >
                          {isAnulada ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                          title="Borrar nota definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note Content */}
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full bg-white border border-indigo-400 rounded-lg p-2 text-xs text-slate-800 outline-none resize-none font-medium"
                    autoFocus
                  />
                ) : (
                  <p
                    className={`font-medium leading-relaxed whitespace-pre-wrap break-words ${
                      isAnulada ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {item.texto}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

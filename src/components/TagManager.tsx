import React, { useState, useMemo } from 'react';
import { Tag, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Search, Building2, HelpCircle } from 'lucide-react';
import { Empresa } from '../types';

interface TagManagerProps {
  empresas: Empresa[];
  onUpdateEmpresa: (empresa: Empresa) => Promise<void>;
  onOpenEmpresa: (id: string) => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  empresas,
  onUpdateEmpresa,
  onOpenEmpresa,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Group and count tags
  const tagList = useMemo(() => {
    const map: { [tag: string]: Empresa[] } = {};
    empresas.forEach(emp => {
      if (emp.tags && Array.isArray(emp.tags)) {
        emp.tags.forEach(tag => {
          const t = tag.trim();
          if (t) {
            if (!map[t]) {
              map[t] = [];
            }
            map[t].push(emp);
          }
        });
      }
    });

    return Object.keys(map)
      .map(tag => ({
        name: tag,
        empresas: map[tag],
        count: map[tag].length,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [empresas]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagList;
    const q = searchQuery.toLowerCase().trim();
    return tagList.filter(t => t.name.toLowerCase().includes(q));
  }, [tagList, searchQuery]);

  const handleStartRename = (name: string) => {
    setEditingTag(name);
    setNewTagName(name);
  };

  const handleCancelRename = () => {
    setEditingTag(null);
    setNewTagName('');
  };

  const handleRenameTag = async (oldName: string) => {
    const trimmedNew = newTagName.trim();
    if (!trimmedNew || trimmedNew === oldName) {
      handleCancelRename();
      return;
    }

    setIsSaving(true);
    try {
      const affected = empresas.filter(emp => emp.tags && emp.tags.includes(oldName));
      for (const emp of affected) {
        let updatedTags = emp.tags.map(t => t === oldName ? trimmedNew : t);
        // Remove duplicates if any
        updatedTags = Array.from(new Set(updatedTags));
        await onUpdateEmpresa({ ...emp, tags: updatedTags });
      }
      handleCancelRename();
    } catch (err) {
      console.error('Error al renombrar etiqueta:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la categoría "${tagName}" de todas las empresas asociadas (${empresas.filter(e => e.tags?.includes(tagName)).length} empresas)?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const affected = empresas.filter(emp => emp.tags && emp.tags.includes(tagName));
      for (const emp of affected) {
        const updatedTags = emp.tags.filter(t => t !== tagName);
        await onUpdateEmpresa({ ...emp, tags: updatedTags });
      }
    } catch (err) {
      console.error('Error al eliminar etiqueta:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (tagName: string) => {
    if (expandedTag === tagName) {
      setExpandedTag(null);
    } else {
      setExpandedTag(tagName);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-500" />
            Gestión de Materiales / Categorías de Suministro (Tags)
          </h4>
          <p className="text-slate-500 text-[11px] mt-1">
            Administra las etiquetas y categorías asignadas a tus proveedores. Los cambios se aplicarán globalmente a todas las empresas asociadas.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar etiqueta..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {isSaving && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-center gap-2 mt-4 animate-pulse">
          <HelpCircle className="w-4 h-4 animate-spin" />
          <span>Sincronizando cambios en la base de datos... Por favor, espera.</span>
        </div>
      )}

      {/* Main Grid/List of Tags */}
      <div className="mt-4 space-y-2">
        {filteredTags.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            {searchQuery ? 'No se encontraron etiquetas que coincidan con la búsqueda.' : 'No hay etiquetas creadas en ningún proveedor.'}
          </div>
        ) : (
          filteredTags.map(tag => {
            const isEditing = editingTag === tag.name;
            const isExpanded = expandedTag === tag.name;

            return (
              <div
                key={tag.name}
                className={`border rounded-xl transition-all overflow-hidden ${
                  isExpanded ? 'border-indigo-100 bg-indigo-50/10' : 'border-slate-150 hover:border-slate-300 bg-white'
                }`}
              >
                {/* Header Row */}
                <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(tag.name)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 max-w-md">
                        <input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="bg-white border border-indigo-500 rounded-lg py-1 px-2.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500 flex-1 font-medium text-slate-800"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTag(tag.name);
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameTag(tag.name)}
                          disabled={isSaving || !newTagName.trim()}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer disabled:bg-slate-200"
                          title="Guardar nombre"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                          🏷️ {tag.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
                          {tag.count} {tag.count === 1 ? 'empresa' : 'empresas'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions (Rename / Delete) */}
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartRename(tag.name)}
                        disabled={isSaving}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        title="Renombrar etiqueta globalmente"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(tag.name)}
                      disabled={isSaving}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Eliminar etiqueta globalmente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details: List of associated Companies */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-3.5 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Empresas con esta etiqueta:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {tag.empresas.map(emp => (
                        <div
                          key={emp.id}
                          onClick={() => onOpenEmpresa(emp.id!)}
                          className="p-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">🏢</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{emp.nombre}</p>
                              <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                                {emp.tipo} · {emp.ciudad || 'Sin ciudad'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Ver Ficha
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

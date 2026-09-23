/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, ChevronRight, ChevronDown, Phone, Mail, MessageCircle, 
  Crown, Shield, Search, X, UserCheck, ArrowDownRight, Layers
} from 'lucide-react';
import { Contacto } from '../../types';

export interface NodoJerarquia {
  contacto: Contacto;
  subordinados: NodoJerarquia[];
}

interface JerarquiaNodoProps {
  nodo: NodoJerarquia;
  nivel: number;
  onSelectContacto?: (id: string) => void;
  todosContactos: Contacto[];
  searchTerm: string;
}

export const JerarquiaNodo: React.FC<JerarquiaNodoProps> = ({
  nodo,
  nivel,
  onSelectContacto,
  todosContactos,
  searchTerm,
}) => {
  const { contacto, subordinados } = nodo;
  const [isExpanded, setIsExpanded] = useState(true);

  const superior = contacto.reportaA
    ? todosContactos.find((c) => c.id === contacto.reportaA)
    : null;

  const isMatch = useMemo(() => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase().trim();
    return (
      (contacto.nombre || '').toLowerCase().includes(term) ||
      (contacto.cargo || '').toLowerCase().includes(term) ||
      (contacto.email || '').toLowerCase().includes(term)
    );
  }, [searchTerm, contacto]);

  // Clean WhatsApp number
  const cleanPhone = (contacto.telefono || '').replace(/\D/g, '');

  const getInitials = (nombre: string) => {
    const parts = (nombre || '?').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0][0] || '?').toUpperCase();
  };

  return (
    <div className="relative pl-3 sm:pl-5 border-l-2 border-indigo-100/70 ml-2 sm:ml-4 py-1.5 transition-all">
      {/* Curved connector indicator */}
      {nivel > 0 && (
        <span className="absolute -left-0.5 top-5 w-3.5 sm:w-5 h-4 border-b-2 border-l-2 border-indigo-200 rounded-bl-lg pointer-events-none" />
      )}

      <div
        onClick={() => onSelectContacto?.(contacto.id!)}
        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
          isMatch
            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200'
            : nivel === 0
            ? 'bg-gradient-to-r from-white via-indigo-50/20 to-white border-indigo-200/80 hover:border-indigo-400'
            : 'bg-white border-slate-200 hover:border-indigo-300'
        }`}
      >
        {/* Left: Avatar & Information */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-xs ${
                contacto.estado === 'inactivo'
                  ? 'bg-slate-100 text-slate-400'
                  : nivel === 0
                  ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              }`}
            >
              {getInitials(contacto.nombre)}
            </div>
            {/* Online/Active status dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                contacto.estado === 'activo' ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors truncate">
                {contacto.nombre}
              </p>
              {nivel === 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                  <Crown className="w-2.5 h-2.5 text-amber-600" /> Líder / Superior
                </span>
              )}
              {isMatch && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
                  Coincidencia
                </span>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
              {contacto.cargo || 'Sin cargo definido'}
            </p>

            {superior && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-slate-300" />
                Reporta a: <span className="font-semibold text-slate-600">{superior.nombre}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Quick actions & Hierarchy toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 mt-2.5 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          {/* Quick contact direct actions (stopPropagation) */}
          <div className="flex items-center gap-1">
            {contacto.telefono && (
              <a
                href={`tel:${contacto.telefono}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title={`Llamar a ${contacto.telefono}`}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            {contacto.email && (
              <a
                href={`mailto:${contacto.email}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title={`Enviar correo a ${contacto.email}`}
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Subordinates Expand/Collapse Pill */}
          {subordinados.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer"
              title={isExpanded ? 'Contraer subordinados' : 'Expandir subordinados'}
            >
              <Users className="w-3 h-3 text-indigo-500" />
              <span>{subordinados.length}</span>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>
          )}

          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all hidden sm:block" />
        </div>
      </div>

      {/* Subordinates Recursive Rendering */}
      {subordinados.length > 0 && isExpanded && (
        <div className="mt-2 space-y-2">
          {subordinados.map((sub, idx) => (
            <JerarquiaNodo
              key={sub.contacto.id || idx}
              nodo={sub}
              nivel={nivel + 1}
              onSelectContacto={onSelectContacto}
              todosContactos={todosContactos}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface OrganigramaTreeProps {
  contactosEmpresa: Contacto[];
  todosContactos: Contacto[];
  onSelectContacto?: (id: string) => void;
}

export const OrganigramaTree: React.FC<OrganigramaTreeProps> = ({
  contactosEmpresa,
  todosContactos,
  onSelectContacto,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Build hierarchy tree
  const { raices, totalLideres, totalSubordinados } = useMemo(() => {
    if (!contactosEmpresa || contactosEmpresa.length === 0) {
      return { raices: [], totalLideres: 0, totalSubordinados: 0 };
    }

    const map: { [id: string]: NodoJerarquia } = {};
    contactosEmpresa.forEach((c) => {
      if (c.id) {
        map[c.id] = { contacto: c, subordinados: [] };
      }
    });

    const rootNodes: NodoJerarquia[] = [];
    let subCount = 0;

    contactosEmpresa.forEach((c) => {
      if (!c.id) return;
      const reportaAId = c.reportaA;
      if (reportaAId && map[reportaAId]) {
        map[reportaAId].subordinados.push(map[c.id]);
        subCount++;
      } else {
        rootNodes.push(map[c.id]);
      }
    });

    return {
      raices: rootNodes,
      totalLideres: rootNodes.length,
      totalSubordinados: subCount,
    };
  }, [contactosEmpresa]);

  if (!contactosEmpresa || contactosEmpresa.length === 0) {
    return (
      <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <Users className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">No hay contactos registrados en esta empresa</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
          Crea contactos y define a quién reportan en el campo "Reporta a" para estructurar la cadena de mando automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Executive Summary Bar & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-slate-200/60 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700">{contactosEmpresa.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">contactos</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-slate-200/60 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-slate-700">{totalLideres}</span>
            <span className="text-[11px] text-slate-400 font-medium">{totalLideres === 1 ? 'líder' : 'líderes'}</span>
          </div>
          {totalSubordinados > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-xl border border-slate-200/60 shadow-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">{totalSubordinados}</span>
              <span className="text-[11px] text-slate-400 font-medium">subordinados</span>
            </div>
          )}
        </div>

        {/* Search within organigram */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-700 font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Organigram Tree Nodes */}
      <div className="space-y-3 pt-1">
        {raices.map((raiz, idx) => (
          <JerarquiaNodo
            key={raiz.contacto.id || idx}
            nodo={raiz}
            nivel={0}
            todosContactos={todosContactos}
            onSelectContacto={onSelectContacto}
            searchTerm={searchTerm}
          />
        ))}
      </div>
    </div>
  );
};

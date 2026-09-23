/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Building2, Tag, Users, CheckCircle2, AlertCircle, XCircle, 
  Clock, ShieldAlert, MapPin, Truck, Wrench
} from 'lucide-react';
import { Empresa } from '../types';

interface CompanyCardProps {
  empresa: Empresa;
  contactCount: number;
  score: {
    nivel: 'verde' | 'amarillo' | 'rojo' | 'gris';
    label: string;
    dias: number | null;
  };
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onClick: () => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  empresa,
  contactCount,
  score,
  selectedTag,
  onTagClick,
  onClick,
}) => {
  const getTipoIcon = () => {
    switch (empresa.tipo) {
      case 'fabricante':
        return (
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Building2 className="w-5 h-5" />
          </div>
        );
      case 'distribuidor':
        return (
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Truck className="w-5 h-5" />
          </div>
        );
      case 'servicios':
        return (
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100">
            <Wrench className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
            <Building2 className="w-5 h-5" />
          </div>
        );
    }
  };

  const getEstadoBadge = () => {
    switch (empresa.estado) {
      case 'homologado':
      case 'validado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Homologado
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-indigo-500" /> En proceso
          </span>
        );
      case 'en_cuarentena':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Cuarentena
          </span>
        );
      case 'no_apto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> No apto
          </span>
        );
      case 'inactivo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Inactivo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <AlertCircle className="w-3.5 h-3.5 text-blue-500" /> Prospecto
          </span>
        );
    }
  };

  const getScoreTheme = () => {
    switch (score.nivel) {
      case 'verde':
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
      case 'amarillo':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
      case 'rojo':
        return { bg: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const scoreTheme = getScoreTheme();
  const locationText = [empresa.ciudad, empresa.provincia || empresa.pais].filter(Boolean).join(', ');

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top bar: Icon, Name & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {getTipoIcon()}
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-indigo-600 transition-colors truncate">
                {empresa.nombre}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {empresa.tipo}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {getEstadoBadge()}
          </div>
        </div>

        {/* Metadata info */}
        <div className="space-y-1.5 text-xs text-slate-500 my-3.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">NIT / NIF:</span>
            <span className="font-mono font-bold text-slate-700">{empresa.nit || 'Sin definir'}</span>
          </div>
          {locationText && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> Ubicación:
              </span>
              <span className="font-semibold text-slate-700 truncate max-w-[170px]">{locationText}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" /> Contactos:
            </span>
            <span className="font-bold text-slate-700">
              {contactCount} {contactCount === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>

        {/* UNSPSC Codes */}
        {empresa.unspscCodes && empresa.unspscCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {empresa.unspscCodes.slice(0, 2).map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/70 text-indigo-700 border border-indigo-150 text-[10px] font-bold truncate max-w-[160px]"
                title={`${item.code}: ${item.name}`}
              >
                <span className="font-mono text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded-sm">{item.code}</span>
                <span className="truncate">{item.name}</span>
              </span>
            ))}
            {empresa.unspscCodes.length > 2 && (
              <span
                className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-lg"
                title={empresa.unspscCodes.slice(2).map((i) => `${i.code}: ${i.name}`).join(', ')}
              >
                +{empresa.unspscCodes.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Tags & Score Pill */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Tags */}
        <div className="flex flex-wrap gap-1 min-w-0">
          {empresa.tags && empresa.tags.length > 0 ? (
            empresa.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer border ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-300 font-medium">Sin etiquetas</span>
          )}
          {empresa.tags && empresa.tags.length > 2 && (
            <span className="text-[10px] text-slate-400 font-bold">
              +{empresa.tags.length - 2}
            </span>
          )}
        </div>

        {/* Score Pill */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${scoreTheme.bg}`}>
          <span className={`w-2 h-2 rounded-full ${scoreTheme.dot}`}></span>
          <span>{score.label}</span>
        </div>
      </div>
    </div>
  );
};

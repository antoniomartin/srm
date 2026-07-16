/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, Tag, Users, CheckCircle2, AlertCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
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
      case 'fabricante': return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'distribuidor': return <Building2 className="w-5 h-5 text-amber-500" />;
      case 'servicios': return <Building2 className="w-5 h-5 text-teal-500" />;
      default: return <Building2 className="w-5 h-5 text-slate-500" />;
    }
  };

  const getEstadoBadge = () => {
    switch (empresa.estado) {
      case 'homologado':
      case 'validado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Homologado
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
            <Clock className="w-3.5 h-3.5 animate-spin-slow" /> En proceso
          </span>
        );
      case 'en_cuarentena':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" /> En cuarentena
          </span>
        );
      case 'no_apto':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> No apto
          </span>
        );
      case 'inactivo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Inactivo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" /> Prospecto
          </span>
        );
    }
  };

  const getScoreColor = () => {
    switch (score.nivel) {
      case 'verde': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amarillo': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rojo': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
              {getTipoIcon()}
            </div>
            <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
              {empresa.nombre}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {getEstadoBadge()}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500 mb-4">
          <p className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">NIT:</span> {empresa.nit || 'Sin NIT'}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{contactCount} contacto{contactCount !== 1 ? 's' : ''}</span>
          </p>
        </div>

        {empresa.unspscCodes && empresa.unspscCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {empresa.unspscCodes.slice(0, 2).map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold truncate max-w-[160px]"
                title={`${item.code}: ${item.name}`}
              >
                <span className="font-mono text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded-sm">{item.code}</span>
                <span className="truncate">{item.name}</span>
              </span>
            ))}
            {empresa.unspscCodes.length > 2 && (
              <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg" title={empresa.unspscCodes.slice(2).map(i => `${i.code}: ${i.name}`).join(', ')}>
                +{empresa.unspscCodes.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {empresa.tags && empresa.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {empresa.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer border ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {empresa.tags.length > 3 && (
              <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5">
                +{empresa.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getScoreColor()}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {score.label}
        </div>
      </div>
    </div>
  );
};

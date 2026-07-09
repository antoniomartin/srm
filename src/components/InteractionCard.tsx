/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Phone, Mail, Award, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Interaccion } from '../types';

interface InteractionCardProps {
  interaccion: Interaccion;
  contactoNombres: string;
  empresaNombre: string;
  fechaRelativaHtml: string;
  isOverdue: boolean;
  onClick: () => void;
}

export const InteractionCard: React.FC<InteractionCardProps> = ({
  interaccion,
  contactoNombres,
  empresaNombre,
  fechaRelativaHtml,
  isOverdue,
  onClick,
}) => {
  const getTipoBadge = () => {
    switch (interaccion.tipo) {
      case 'reunion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            🤝 Reunión
          </span>
        );
      case 'llamada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            📞 Llamada
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            ✉️ Correo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            🏢 Feria
          </span>
        );
    }
  };

  const getEstadoBadge = () => {
    if (interaccion.estado === 'completada') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Completada
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        <AlertCircle className="w-3.5 h-3.5" /> {isOverdue ? 'Vencida' : 'Pendiente'}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isOverdue ? 'border-rose-300 shadow-sm shadow-rose-50' : 'border-slate-200'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            {getTipoBadge()}
            {getEstadoBadge()}
          </div>
          <div 
            className="text-[11px] text-slate-400 font-medium"
            dangerouslySetInnerHTML={{ __html: fechaRelativaHtml }}
          />
        </div>

        <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-1">
          {interaccion.asunto}
        </h4>

        <div className="space-y-1 text-xs text-slate-500 mb-3.5">
          <p className="line-clamp-1 font-medium text-slate-700">
            <span>👥 Asistentes:</span> {contactoNombres || 'Desconocido'}
          </p>
          {empresaNombre && (
            <p className="line-clamp-1">
              <span>🏭 Empresa:</span> {empresaNombre}
            </p>
          )}
        </div>

        {interaccion.descripcion && (
          <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-lg p-2.5 mb-3 border border-slate-100">
            {interaccion.descripcion}
          </p>
        )}
      </div>

      {interaccion.fechaLimite && interaccion.estado === 'pendiente' && (
        <div className={`mt-2.5 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
          isOverdue ? 'border-rose-100 text-rose-600' : 'border-slate-100 text-purple-600'
        }`}>
          <span className="flex items-center gap-1">
            ⏰ Límite de resolución:
          </span>
          <span>
            {new Date(interaccion.fechaLimite + 'T12:00:00').toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Phone, Mail, Award, MessageSquare, AlertCircle, CheckCircle2, Clock, CheckSquare } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            🤝 Reunión
          </span>
        );
      case 'llamada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            📞 Llamada
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            ✉️ Correo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            🏢 Feria / Evento
          </span>
        );
    }
  };

  const getEstadoBadge = () => {
    if (interaccion.estado === 'completada') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completada
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${
          isOverdue
            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-current" /> {isOverdue ? 'Vencida' : 'Pendiente'}
      </span>
    );
  };

  const pasos = interaccion.pasos || [];
  const pasosCompletados = pasos.filter((p) => p.completado).length;

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isOverdue ? 'border-rose-300 shadow-xs shadow-rose-50' : 'border-slate-200/90'
      }`}
    >
      <div>
        {/* Top Badges & Date */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {getTipoBadge()}
            {getEstadoBadge()}
          </div>
          <div
            className="text-[11px] text-slate-400 font-semibold"
            dangerouslySetInnerHTML={{ __html: fechaRelativaHtml }}
          />
        </div>

        {/* Title */}
        <h4 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
          {interaccion.asunto}
        </h4>

        {/* Participants & Company */}
        <div className="space-y-1 text-xs text-slate-500 mb-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
          <p className="line-clamp-1 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Asistentes:</span>
            <span className="font-bold text-slate-700 truncate max-w-[170px]">
              {contactoNombres || 'Sin asistentes asignados'}
            </span>
          </p>
          {empresaNombre && (
            <p className="line-clamp-1 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Empresa:</span>
              <span className="font-semibold text-indigo-600 truncate max-w-[170px]">{empresaNombre}</span>
            </p>
          )}
        </div>

        {/* Description Snippet */}
        {interaccion.descripcion && (
          <p className="text-xs text-slate-600 line-clamp-2 bg-white rounded-xl p-2.5 mb-3 border border-slate-100 leading-relaxed font-medium">
            {interaccion.descripcion}
          </p>
        )}

        {/* Steps / Commitments progress */}
        {pasos.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {pasosCompletados} de {pasos.length} pasos completados
            </span>
          </div>
        )}
      </div>

      {/* Deadline Footer */}
      {interaccion.fechaLimite && interaccion.estado === 'pendiente' && (
        <div
          className={`mt-2 pt-2.5 border-t flex items-center justify-between text-xs font-bold ${
            isOverdue ? 'border-rose-100 text-rose-600' : 'border-slate-100 text-purple-700'
          }`}
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Límite de resolución:
          </span>
          <span className="font-mono">
            {new Date(interaccion.fechaLimite + 'T12:00:00').toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
};

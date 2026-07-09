/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Mail, Phone, ExternalLink } from 'lucide-react';
import { Contacto } from '../types';

interface ContactCardProps {
  contacto: Contacto;
  empresaNombre: string;
  pendingCount: number;
  superiorNombre?: string | null;
  onClick: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contacto,
  empresaNombre,
  pendingCount,
  superiorNombre,
  onClick,
}) => {
  const isInactive = contacto.estado === 'inactivo';

  const getInitials = () => {
    const parts = (contacto.nombre || '?').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0][0] || '?').toUpperCase();
  };

  const getAvatarBg = () => {
    if (isInactive) return 'bg-slate-200 text-slate-400';
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-emerald-100 text-emerald-700',
      'bg-teal-100 text-teal-700',
      'bg-amber-100 text-amber-700',
    ];
    const code = (contacto.nombre || '').charCodeAt(0) || 0;
    return colors[code % colors.length];
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isInactive ? 'opacity-65 bg-slate-50' : ''
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {contacto.foto ? (
              <img
                src={contacto.foto}
                alt={contacto.nombre}
                className={`w-11 h-11 rounded-full object-cover border border-slate-100 ${
                  isInactive ? 'grayscale' : ''
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarBg()}`}>
                {getInitials()}
              </div>
            )}
            <div>
              <h3 className={`font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1 ${
                isInactive ? 'line-through text-slate-500' : ''
              }`}>
                {contacto.nombre}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{contacto.cargo || 'Sin cargo'}</p>
            </div>
          </div>

          <div className="flex-shrink-0">
            {isInactive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Inactivo
              </span>
            ) : pendingCount > 0 ? (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                ⏳ {pendingCount} pend.
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Al día
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          <p className="flex items-center gap-1.5 font-medium text-indigo-600 hover:underline">
            <span className="text-slate-400 font-normal text-[11px]">Empresa:</span> {empresaNombre || 'Sin empresa'}
          </p>
          {superiorNombre && (
            <p className="flex items-center gap-1 text-[11px] font-normal text-slate-400">
              <span className="font-normal text-[10px]">Reporta a:</span> 
              <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{superiorNombre}</span>
            </p>
          )}
          {contacto.email && (
            <p className="flex items-center gap-1.5 line-clamp-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{contacto.email}</span>
            </p>
          )}
          {contacto.telefono && (
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{contacto.telefono}</span>
            </p>
          )}
        </div>
      </div>

      {(contacto.empresaIds && contacto.empresaIds.length > 0) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-medium">Asociado a:</span>
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            {contacto.empresaIds.length} más
          </span>
        </div>
      )}
    </div>
  );
};

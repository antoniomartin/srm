/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Mail, Phone, ExternalLink, MessageCircle, ArrowDownRight, Linkedin } from 'lucide-react';
import md5 from 'blueimp-md5';
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
  const [gravatarFailed, setGravatarFailed] = React.useState(false);

  React.useEffect(() => {
    setGravatarFailed(false);
  }, [contacto.email]);

  const gravatarUrl = React.useMemo(() => {
    if (!contacto.email || !contacto.email.trim()) return null;
    const hash = md5(contacto.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?s=150&d=404`;
  }, [contacto.email]);

  const getInitials = () => {
    const parts = (contacto.nombre || '?').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0][0] || '?').toUpperCase();
  };

  const getAvatarBg = () => {
    if (isInactive) return 'bg-slate-100 text-slate-400';
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
    ];
    const code = (contacto.nombre || '').charCodeAt(0) || 0;
    return colors[code % colors.length];
  };

  // WhatsApp helper
  const cleanPhone = (contacto.telefono || '').replace(/\D/g, '');
  const finalWaPhone = cleanPhone.length === 9 && ['6', '7', '9'].includes(cleanPhone[0])
    ? '34' + cleanPhone
    : cleanPhone;

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border border-slate-200/90 p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isInactive ? 'opacity-70 bg-slate-50/60' : ''
      }`}
    >
      <div>
        {/* Top Header: Avatar, Name & Status Pill */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            {contacto.foto ? (
              <img
                src={contacto.foto}
                alt={contacto.nombre}
                className={`w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-2xs ${
                  isInactive ? 'grayscale' : ''
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : !gravatarFailed && gravatarUrl ? (
              <img
                src={gravatarUrl}
                alt={contacto.nombre}
                className={`w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-2xs ${
                  isInactive ? 'grayscale' : ''
                }`}
                onError={() => {
                  setGravatarFailed(true);
                }}
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs ${getAvatarBg()}`}
              >
                {getInitials()}
              </div>
            )}

            <div className="min-w-0">
              <h3
                className={`font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors truncate ${
                  isInactive ? 'line-through text-slate-400' : ''
                }`}
              >
                {contacto.nombre}
              </h3>
              <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                {contacto.cargo || 'Sin cargo definido'}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            {isInactive ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                Inactivo
              </span>
            ) : pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                ⏳ {pendingCount} pend.
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                ✓ Al día
              </span>
            )}
          </div>
        </div>

        {/* Company & Hierarchy */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
          <p className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Empresa:</span>
            <span className="font-bold text-indigo-600 hover:underline truncate max-w-[170px]">
              {empresaNombre || 'Sin empresa'}
            </span>
          </p>
          {superiorNombre && (
            <p className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-slate-400" /> Reporta a:
              </span>
              <span className="font-semibold text-slate-700 truncate max-w-[170px]">{superiorNombre}</span>
            </p>
          )}
        </div>
      </div>

      {/* Action Footer: Phone, WhatsApp, Mail, LinkedIn */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {contacto.email ? (
            <a
              href={`mailto:${contacto.email}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={`Enviar correo a ${contacto.email}`}
            >
              <Mail className="w-4 h-4" />
            </a>
          ) : null}

          {contacto.telefono ? (
            <a
              href={`tel:${contacto.telefono}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title={`Llamar a ${contacto.telefono}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          ) : null}

          {finalWaPhone ? (
            <a
              href={`https://wa.me/${finalWaPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          ) : null}

          {contacto.linkedin ? (
            <a
              href={contacto.linkedin.startsWith('http') ? contacto.linkedin : `https://${contacto.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Ver perfil de LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          ) : null}
        </div>

        {contacto.empresaIds && contacto.empresaIds.length > 0 && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
            +{contacto.empresaIds.length} vinc.
          </span>
        )}
      </div>
    </div>
  );
};

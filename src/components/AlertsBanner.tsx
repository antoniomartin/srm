/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Calendar, AlertTriangle, FileWarning, ArrowRight, ShieldAlert } from 'lucide-react';
import { Interaccion, Documento, Empresa } from '../types';

interface AlertsBannerProps {
  overdueInteractions: Interaccion[];
  expiringDocs: { doc: Documento; companyName: string; dias: number }[];
  inactiveCompanies: { emp: Empresa; dias: number | null }[];
  onOpenAlerts: () => void;
}

export const AlertsBanner: React.FC<AlertsBannerProps> = ({
  overdueInteractions,
  expiringDocs,
  inactiveCompanies,
  onOpenAlerts,
}) => {
  const totalAlerts = overdueInteractions.length + expiringDocs.length + inactiveCompanies.length;

  if (totalAlerts === 0) return null;

  return (
    <div
      onClick={onOpenAlerts}
      className="bg-gradient-to-r from-amber-50 via-white to-amber-50/50 hover:to-amber-100/60 border border-amber-200/90 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:shadow-md"
    >
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 text-white rounded-xl shadow-xs shadow-amber-200 flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
            <span>Centro de Notificaciones Operativas</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
              {totalAlerts} pendientes
            </span>
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {overdueInteractions.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <Calendar className="w-3 h-3 text-rose-500" /> {overdueInteractions.length} vencida{overdueInteractions.length !== 1 ? 's' : ''}
              </span>
            )}
            {expiringDocs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100/70 text-amber-800 border border-amber-300">
                <FileWarning className="w-3 h-3 text-amber-600" /> {expiringDocs.length} doc{expiringDocs.length !== 1 ? 's' : ''} por caducar
              </span>
            )}
            {inactiveCompanies.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <AlertCircle className="w-3 h-3 text-slate-500" /> {inactiveCompanies.length} sin contacto
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900 hover:text-amber-950 bg-white border border-amber-300 rounded-xl px-3.5 py-2 shadow-2xs hover:bg-amber-50 transition-colors shrink-0 cursor-pointer"
      >
        <span>Gestionar Alertas</span>
        <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
      </button>
    </div>
  );
};

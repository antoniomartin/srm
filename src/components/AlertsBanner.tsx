/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, Calendar, AlertTriangle, FileWarning, ArrowRight } from 'lucide-react';
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
      className="bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm hover:shadow"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500 text-white rounded-lg flex-shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-amber-800 text-sm">
            Tienes {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} de atención pendiente
          </h4>
          <p className="text-xs text-amber-700/90 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
            {overdueInteractions.length > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" /> {overdueInteractions.length} vencida{overdueInteractions.length !== 1 ? 's' : ''}
              </span>
            )}
            {expiringDocs.length > 0 && (
              <span className="flex items-center gap-1">
                <FileWarning className="w-3.5 h-3.5 text-amber-600" /> {expiringDocs.length} documento{expiringDocs.length !== 1 ? 's' : ''} por caducar
              </span>
            )}
            {inactiveCompanies.length > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> {inactiveCompanies.length} empresa{inactiveCompanies.length !== 1 ? 's' : ''} sin contacto
              </span>
            )}
          </p>
        </div>
      </div>
      <button className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-white border border-amber-300 rounded-lg px-3 py-1.5 shadow-sm">
        Ver detalles <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

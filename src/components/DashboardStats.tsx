/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Building2, Users, MessageSquare, Link, Clock } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    empresas: number;
    contactos: number;
    interacciones: number;
    relaciones: number;
    pendientes: number;
  };
  onNavigate?: (tab: 'empresas' | 'contactos' | 'interacciones' | 'mapa') => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, onNavigate }) => {
  const cards = [
    {
      title: 'Empresas',
      value: stats.empresas,
      icon: <Building2 className="w-4 h-4" />,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
      accent: 'bg-indigo-500',
      hoverRing: 'hover:ring-indigo-200',
      tab: 'empresas' as const,
    },
    {
      title: 'Contactos',
      value: stats.contactos,
      icon: <Users className="w-4 h-4" />,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      accent: 'bg-emerald-500',
      hoverRing: 'hover:ring-emerald-200',
      tab: 'contactos' as const,
    },
    {
      title: 'Interacciones',
      value: stats.interacciones,
      icon: <MessageSquare className="w-4 h-4" />,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      accent: 'bg-amber-500',
      hoverRing: 'hover:ring-amber-200',
      tab: 'interacciones' as const,
    },
    {
      title: 'Distribución',
      value: stats.relaciones,
      icon: <Link className="w-4 h-4" />,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      accent: 'bg-teal-500',
      hoverRing: 'hover:ring-teal-200',
      tab: 'mapa' as const,
    },
    {
      title: 'Pendientes',
      value: stats.pendientes,
      icon: <Clock className="w-4 h-4" />,
      iconColor: stats.pendientes > 0 ? 'text-rose-600' : 'text-slate-500',
      iconBg: stats.pendientes > 0 ? 'bg-rose-50' : 'bg-slate-50',
      accent: stats.pendientes > 0 ? 'bg-rose-500' : 'bg-slate-300',
      hoverRing: stats.pendientes > 0 ? 'hover:ring-rose-200 ring-1 ring-rose-100' : 'hover:ring-slate-200',
      tab: 'interacciones' as const,
      urgent: stats.pendientes > 0,
    },
  ];

  return (
    <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-0.5 scrollbar-none">
      {cards.map((card, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onNavigate?.(card.tab)}
          className={`
            flex items-center gap-2.5 flex-shrink-0
            bg-white border border-slate-200 rounded-xl
            px-3 py-2
            shadow-xs hover:shadow-sm
            ring-2 ring-transparent ${card.hoverRing}
            transition-all duration-150 cursor-pointer
            group relative overflow-hidden
          `}
          title={`Ir a ${card.title}`}
        >
          {/* Accent bar on the left */}
          <span className={`absolute left-0 top-2 bottom-2 w-0.5 ${card.accent} rounded-full opacity-70 group-hover:opacity-100 group-hover:top-0 group-hover:bottom-0 transition-all duration-200`} />

          {/* Icon */}
          <span className={`${card.iconBg} ${card.iconColor} p-1.5 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-150`}>
            {card.icon}
          </span>

          {/* Counter + Label */}
          <span className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-base sm:text-lg font-black text-slate-900 leading-none tabular-nums">
              {card.value}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold truncate ${card.urgent ? 'text-rose-500' : 'text-slate-500'}`}>
              {card.title}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
};

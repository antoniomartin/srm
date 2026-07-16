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
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Empresas',
      value: stats.empresas,
      icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />,
      bg: 'bg-indigo-50/50 border-indigo-100',
    },
    {
      title: 'Contactos',
      value: stats.contactos,
      icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />,
      bg: 'bg-emerald-50/50 border-emerald-100',
    },
    {
      title: 'Interacciones',
      value: stats.interacciones,
      icon: <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />,
      bg: 'bg-amber-50/50 border-amber-100',
    },
    {
      title: 'Asociaciones',
      value: stats.relaciones,
      icon: <Link className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />,
      bg: 'bg-teal-50/50 border-teal-100',
    },
    {
      title: 'Tareas Pendientes',
      value: stats.pendientes,
      icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />,
      bg: `bg-rose-50/50 border-rose-100 ${stats.pendientes > 0 ? 'ring-1 ring-rose-200 ring-offset-1' : ''}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border ${card.bg} transition-all duration-200 hover:shadow-sm`}
        >
          <div className="p-1 sm:p-2 bg-white rounded-lg border border-slate-100 shadow-sm flex-shrink-0">
            {card.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 line-clamp-1 uppercase tracking-wider">{card.title}</p>
            <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 leading-tight mt-0.5">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Interaccion, Contacto, Empresa } from '../types';

interface CustomCalendarProps {
  interacciones: Interaccion[];
  contactos: Contacto[];
  empresas: Empresa[];
  onEventClick: (interaccionId: string) => void;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  interacciones,
  contactos,
  empresas,
  onEventClick,
}) => {
  const [currentDate, setCurrentYearMonth] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentYearMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentYearMonth(new Date(year, month + 1, 1));
  };

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Get start day of month (0: Sunday, 1: Monday, etc. Let's make 0 Monday-based)
  let startDay = new Date(year, month, 1).getDay();
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check for interaction events
    const dayInteractions = interacciones.filter(i => i.fecha === dateStr);
    
    // Check for deadline events
    const dayDeadlines = interacciones.filter(i => i.fechaLimite === dateStr && i.estado === 'pendiente');

    return {
      interactions: dayInteractions,
      deadlines: dayDeadlines,
    };
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-indigo-500" />
          <span>{monthNames[month]} {year}</span>
        </h3>
        <div className="flex gap-1">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentYearMonth(new Date())}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 bg-slate-50 py-2 border-b border-slate-200">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mié</div>
        <div>Jue</div>
        <div>Vie</div>
        <div>Sáb</div>
        <div>Dom</div>
      </div>

      <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)] border-b border-r border-slate-100">
        {daysArray.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="bg-slate-50/50 border-l border-t border-slate-100"></div>;
          }

          const { interactions, deadlines } = getEventsForDay(day);
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div 
              key={idx} 
              className={`p-2 border-l border-t border-slate-100 flex flex-col justify-between hover:bg-slate-50/30 transition-colors ${
                isToday ? 'bg-indigo-50/20' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  isToday 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600'
                }`}>
                  {day}
                </span>
              </div>

              <div className="space-y-1">
                {interactions.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onEventClick(item.id!)}
                    className={`text-[10px] font-semibold p-1 rounded border truncate cursor-pointer transition-all ${
                      item.estado === 'completada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                    title={`${item.tipo === 'reunion' ? '🤝' : item.tipo === 'llamada' ? '📞' : item.tipo === 'email' ? '✉️' : '🏢'} ${item.asunto}`}
                  >
                    {item.tipo === 'reunion' ? '🤝' : item.tipo === 'llamada' ? '📞' : item.tipo === 'email' ? '✉️' : '🏢'} {item.asunto}
                  </div>
                ))}

                {deadlines.map(item => {
                  const isOverdue = new Date(item.fechaLimite!) < new Date();
                  return (
                    <div
                      key={item.id + '_deadline'}
                      onClick={() => onEventClick(item.id!)}
                      className={`text-[10px] font-bold p-1 rounded border truncate cursor-pointer transition-all ${
                        isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
                          : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      }`}
                      title={`⏰ Límite: ${item.asunto}`}
                    >
                      ⏰ {item.asunto}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-500"></span> Pendiente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 border border-emerald-500"></span> Completada
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-purple-400 border border-purple-500"></span> ⏰ Límite
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-rose-400 border border-rose-500 animate-pulse"></span> ⚠️ Vencida
          </span>
        </div>
        <p className="font-medium text-indigo-600">Calendarizador SRM Premium</p>
      </div>
    </div>
  );
};

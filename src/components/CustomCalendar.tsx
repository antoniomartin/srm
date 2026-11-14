/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Flag,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  Building2,
  User,
} from 'lucide-react';
import { Interaccion, Contacto, Empresa } from '../types';

export type CalendarViewMode = 'mes' | 'semana' | 'dia';

export type CalendarEventType = 'fin' | 'paso' | 'interaccion';

export interface CalendarEvent {
  id: string;
  interaccionId: string;
  tipo: CalendarEventType;
  titulo: string;
  subtitulo?: string;
  fecha: string;
  completado: boolean;
  vencido: boolean;
  interaccionTipo?: string;
  asuntoOriginal: string;
  empresaNombre?: string;
  contactoNombre?: string;
}

interface CustomCalendarProps {
  interacciones: Interaccion[];
  contactos: Contacto[];
  empresas: Empresa[];
  onEventClick: (interaccionId: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const formatDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  interacciones,
  contactos,
  empresas,
  onEventClick,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes');

  const todayStr = formatDateStr(new Date());

  // Helper to extract company & contact names
  const getEntityNames = (inter: Interaccion) => {
    let empresaNombre = '';
    let contactoNombre = '';

    if (inter.contactoId) {
      const c = contactos.find((item) => item.id === inter.contactoId);
      if (c) {
        contactoNombre = c.nombre;
        if (c.empresaId) {
          const emp = empresas.find((e) => e.id === c.empresaId);
          if (emp) empresaNombre = emp.nombre;
        }
      }
    }

    if (!empresaNombre && inter.empresaIds && inter.empresaIds.length > 0) {
      const emp = empresas.find((e) => e.id === inter.empresaIds![0]);
      if (emp) empresaNombre = emp.nombre;
    }

    return { empresaNombre, contactoNombre };
  };

  // Helper to collect all events for a given date
  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    const list: CalendarEvent[] = [];

    interacciones.forEach((inter) => {
      const isCompleted = inter.estado === 'completada';
      const { empresaNombre, contactoNombre } = getEntityNames(inter);

      // 1. Fecha definitiva de fin / límite
      if (inter.fechaLimite && inter.fechaLimite === dateStr) {
        const isOverdue = !isCompleted && inter.fechaLimite < todayStr;
        list.push({
          id: `${inter.id}-fin`,
          interaccionId: inter.id!,
          tipo: 'fin',
          titulo: `Fin: ${inter.asunto}`,
          subtitulo: inter.descripcion,
          fecha: inter.fechaLimite,
          completado: isCompleted,
          vencido: isOverdue,
          interaccionTipo: inter.tipo,
          asuntoOriginal: inter.asunto,
          empresaNombre,
          contactoNombre,
        });
      }

      // 2. Pasos intermedios
      if (inter.pasos && inter.pasos.length > 0) {
        inter.pasos.forEach((paso, idx) => {
          if (paso.fecha && paso.fecha === dateStr) {
            const pasoCompleted = paso.completado || false;
            const pasoOverdue = !pasoCompleted && paso.fecha < todayStr;
            list.push({
              id: `${inter.id}-paso-${idx}`,
              interaccionId: inter.id!,
              tipo: 'paso',
              titulo: `Paso: ${paso.texto}`,
              subtitulo: `Interacción: ${inter.asunto}`,
              fecha: paso.fecha,
              completado: pasoCompleted,
              vencido: pasoOverdue,
              interaccionTipo: inter.tipo,
              asuntoOriginal: inter.asunto,
              empresaNombre,
              contactoNombre,
            });
          }
        });
      }

      // 3. Fecha inicial / cita de la interacción (si no coincide con la fecha límite)
      if (inter.fecha === dateStr && inter.fecha !== inter.fechaLimite) {
        list.push({
          id: `${inter.id}-inicio`,
          interaccionId: inter.id!,
          tipo: 'interaccion',
          titulo: `${inter.tipo === 'reunion' ? '🤝' : inter.tipo === 'llamada' ? '📞' : inter.tipo === 'email' ? '✉️' : '🏢'} ${inter.asunto}`,
          subtitulo: inter.descripcion,
          fecha: inter.fecha,
          completado: isCompleted,
          vencido: !isCompleted && inter.fecha < todayStr,
          interaccionTipo: inter.tipo,
          asuntoOriginal: inter.asunto,
          empresaNombre,
          contactoNombre,
        });
      }
    });

    return list;
  };

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'semana') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 1);
      setCurrentDate(next);
    }
  };

  const handleNext = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'semana') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 1);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get week days (Monday - Sunday)
  const getWeekDays = (base: Date): Date[] => {
    const d = new Date(base);
    const day = d.getDay();
    // Monday as start (if day=0 (Sunday), diff is -6; otherwise 1 - day)
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      days.push(current);
    }
    return days;
  };

  // Header Title
  const getHeaderTitle = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    if (viewMode === 'mes') {
      return `${MONTH_NAMES[m]} ${y}`;
    }

    if (viewMode === 'semana') {
      const week = getWeekDays(currentDate);
      const start = week[0];
      const end = week[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} al ${end.getDate()} de ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${y}`;
    }

    // Día view
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];
    return `${dayOfWeek}, ${currentDate.getDate()} de ${MONTH_NAMES[m]} de ${y}`;
  };

  // Render badge helper
  const renderEventPill = (ev: CalendarEvent, isCompact = true) => {
    let bgClasses = '';
    let icon = null;

    if (ev.tipo === 'fin') {
      if (ev.completado) {
        bgClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
        icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />;
      } else if (ev.vencido) {
        bgClasses = 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-bold animate-pulse';
        icon = <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />;
      } else {
        bgClasses = 'bg-purple-50 text-purple-900 border-purple-250 hover:bg-purple-100 font-bold';
        icon = <Flag className="w-3 h-3 text-purple-600 shrink-0" />;
      }
    } else if (ev.tipo === 'paso') {
      if (ev.completado) {
        bgClasses = 'bg-slate-100 text-slate-500 line-through border-slate-200 hover:bg-slate-150';
        icon = <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />;
      } else if (ev.vencido) {
        bgClasses = 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-semibold';
        icon = <Clock className="w-3 h-3 text-amber-600 shrink-0" />;
      } else {
        bgClasses = 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100 font-semibold';
        icon = <ListTodo className="w-3 h-3 text-sky-600 shrink-0" />;
      }
    } else {
      // interaccion cita
      bgClasses = ev.completado
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
        : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100';
      icon = <Clock className="w-3 h-3 text-indigo-500 shrink-0" />;
    }

    if (isCompact) {
      return (
        <div
          key={ev.id}
          onClick={() => onEventClick(ev.interaccionId)}
          className={`text-[10px] p-1 rounded-md border flex items-center gap-1.5 cursor-pointer transition-all truncate ${bgClasses}`}
          title={`${ev.titulo}${ev.empresaNombre ? ` (${ev.empresaNombre})` : ''}`}
        >
          {icon}
          <span className="truncate">{ev.titulo}</span>
        </div>
      );
    }

    // Detailed card (for Week / Day views)
    return (
      <div
        key={ev.id}
        onClick={() => onEventClick(ev.interaccionId)}
        className={`p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all shadow-2xs hover:shadow-sm ${bgClasses}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold text-xs">
            {icon}
            <span className={ev.completado ? 'line-through' : ''}>{ev.titulo}</span>
          </span>
          <span
            className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
              ev.tipo === 'fin'
                ? 'bg-purple-200/60 text-purple-900'
                : ev.tipo === 'paso'
                ? 'bg-sky-200/60 text-sky-900'
                : 'bg-indigo-200/60 text-indigo-900'
            }`}
          >
            {ev.tipo === 'fin' ? 'Fecha Fin' : ev.tipo === 'paso' ? 'Paso Intermedio' : 'Cita'}
          </span>
        </div>

        {ev.subtitulo && (
          <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed">
            {ev.subtitulo}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] opacity-75">
          {ev.empresaNombre && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {ev.empresaNombre}
            </span>
          )}
          {ev.contactoNombre && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {ev.contactoNombre}
            </span>
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // VISTA MES
  // ─────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const totalDays = new Date(year, month + 1, 0).getDate();
    let startDay = new Date(year, month, 1).getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based

    const daysArray: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(i);
    }

    return (
      <>
        <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-500 bg-slate-50 py-2 border-b border-slate-200">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(65px,auto)] sm:auto-rows-[minmax(95px,auto)] border-b border-r border-slate-100">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="bg-slate-50/40 border-l border-t border-slate-100"></div>;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const events = getEventsForDate(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={idx}
                className={`p-1 sm:p-2 border-l border-t border-slate-100 flex flex-col justify-between hover:bg-slate-50/50 transition-colors ${
                  isToday ? 'bg-indigo-50/25' : ''
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    onClick={() => {
                      setCurrentDate(new Date(year, month, day));
                      setViewMode('dia');
                    }}
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md cursor-pointer hover:underline ${
                      isToday ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700'
                    }`}
                    title="Ver este día en detalle"
                  >
                    {day}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400">
                      {events.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[85px]">
                  {events.map((ev) => renderEventPill(ev, true))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // VISTA SEMANA
  // ─────────────────────────────────────────────────────────────
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[720px] grid grid-cols-7 border-b border-slate-200">
          {weekDays.map((d, idx) => {
            const dateStr = formatDateStr(d);
            const isToday = dateStr === todayStr;
            const events = getEventsForDate(dateStr);

            return (
              <div
                key={idx}
                className={`flex flex-col border-r border-slate-200 last:border-r-0 min-h-[460px] ${
                  isToday ? 'bg-indigo-50/15' : 'bg-white'
                }`}
              >
                {/* Day Header */}
                <div
                  onClick={() => {
                    setCurrentDate(d);
                    setViewMode('dia');
                  }}
                  className={`p-2.5 text-center border-b border-slate-200 cursor-pointer hover:bg-slate-100/60 transition-colors ${
                    isToday ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-700'
                  }`}
                  title="Abrir vista diaria"
                >
                  <p className="text-[11px] uppercase tracking-wider font-bold opacity-80">
                    {DAY_SHORT[d.getDay()]}
                  </p>
                  <p className="text-base font-extrabold">{d.getDate()}</p>
                </div>

                {/* Day Events Column */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[520px]">
                  {events.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center italic mt-6">
                      Sin eventos
                    </p>
                  ) : (
                    events.map((ev) => renderEventPill(ev, false))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // VISTA DÍA
  // ─────────────────────────────────────────────────────────────
  const renderDayView = () => {
    const dateStr = formatDateStr(currentDate);
    const events = getEventsForDate(dateStr);
    const isToday = dateStr === todayStr;

    const fines = events.filter((e) => e.tipo === 'fin');
    const pasos = events.filter((e) => e.tipo === 'paso');
    const citas = events.filter((e) => e.tipo === 'interaccion');

    return (
      <div className="p-4 sm:p-6 space-y-6">
        {/* Day Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span
              className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full mb-1 ${
                isToday ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isToday ? 'Hoy' : DAY_NAMES[currentDate.getDay()]}
            </span>
            <h4 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {currentDate.getDate()} de {MONTH_NAMES[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </h4>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
              🏁 {fines.length} finalizaciones
            </span>
            <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
              📋 {pasos.length} pasos
            </span>
            <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
              🤝 {citas.length} citas
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-600 text-sm">No hay eventos para este día</p>
            <p className="text-xs text-slate-400 mt-1">
              No hay pasos, reuniones ni fechas límites programadas para el {currentDate.toLocaleDateString('es-ES')}.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Fechas de fin / límite */}
            {fines.length > 0 && (
              <div>
                <h5 className="font-bold text-xs uppercase text-purple-900 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Flag className="w-4 h-4 text-purple-600" /> Fechas Límite / Cierre de Interacciones ({fines.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fines.map((ev) => renderEventPill(ev, false))}
                </div>
              </div>
            )}

            {/* Pasos y compromisos */}
            {pasos.length > 0 && (
              <div>
                <h5 className="font-bold text-xs uppercase text-sky-900 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <ListTodo className="w-4 h-4 text-sky-600" /> Pasos y Compromisos Intermedios ({pasos.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pasos.map((ev) => renderEventPill(ev, false))}
                </div>
              </div>
            )}

            {/* Citas / Reuniones */}
            {citas.length > 0 && (
              <div>
                <h5 className="font-bold text-xs uppercase text-indigo-900 tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-4 h-4 text-indigo-600" /> Citas y Reuniones Programadas ({citas.length})
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {citas.map((ev) => renderEventPill(ev, false))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Calendar Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 sm:p-4 border-b border-slate-200 bg-slate-50/80 gap-3">
        {/* Navigation & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{getHeaderTitle()}</span>
          </h3>
        </div>

        {/* View mode toggle (Mes, Semana, Día) */}
        <div className="flex items-center self-end sm:self-auto bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('mes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'mes'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Mes</span>
          </button>
          <button
            onClick={() => setViewMode('semana')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'semana'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Semana</span>
          </button>
          <button
            onClick={() => setViewMode('dia')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'dia'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Día</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Body according to current view */}
      {viewMode === 'mes' && renderMonthView()}
      {viewMode === 'semana' && renderWeekView()}
      {viewMode === 'dia' && renderDayView()}

      {/* Legend Footer */}
      <div className="p-3 sm:px-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap gap-3 sm:gap-6 items-center justify-between font-medium">
        <div className="flex flex-wrap gap-3 sm:gap-5 items-center">
          <span className="flex items-center gap-1.5 font-bold text-purple-900">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-600 shadow-2xs"></span> 🏁 Fecha Límite / Fin
          </span>
          <span className="flex items-center gap-1.5 font-bold text-sky-900">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-sky-500 shadow-2xs"></span> 📋 Paso Intermedio
          </span>
          <span className="flex items-center gap-1.5 font-bold text-indigo-900">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-indigo-600 shadow-2xs"></span> 🤝 Cita / Reunión
          </span>
          <span className="flex items-center gap-1.5 font-bold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600 shadow-2xs"></span> ✓ Completado
          </span>
          <span className="flex items-center gap-1.5 font-bold text-rose-800">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600 shadow-2xs animate-pulse"></span> ⚠️ Vencido
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold">Haz clic en cualquier evento para abrir su ficha</p>
      </div>
    </div>
  );
};

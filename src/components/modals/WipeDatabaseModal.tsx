/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  ShieldAlert, 
  X, 
  Download, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';

export interface WipeDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  counts: {
    empresas: number;
    contactos: number;
    interacciones: number;
    relaciones: number;
    documentos: number;
  };
  onExportExcel: () => void;
  onConfirmWipe: (onProgress: (msg: string) => void) => Promise<void>;
}

const SECURITY_PHRASE = 'BORRAR MI SRM';

export const WipeDatabaseModal: React.FC<WipeDatabaseModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  counts,
  onExportExcel,
  onConfirmWipe,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1Agreed, setStep1Agreed] = useState(false);
  const [securityInput, setSecurityInput] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [isWiping, setIsWiping] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when opening or closing
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStep1Agreed(false);
      setSecurityInput('');
      setCountdown(5);
      setIsWiping(false);
      setProgressText('');
      setErrorMsg('');
    }
  }, [isOpen]);

  // Step 3 Countdown
  useEffect(() => {
    if (step === 3 && isOpen && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen, countdown]);

  if (!isOpen) return null;

  const totalRecords =
    counts.empresas +
    counts.contactos +
    counts.interacciones +
    counts.relaciones +
    counts.documentos;

  const isPhraseValid = securityInput.trim().toUpperCase() === SECURITY_PHRASE;

  const handleExecuteWipe = async () => {
    if (countdown > 0 || isWiping) return;
    setIsWiping(true);
    setErrorMsg('');
    try {
      await onConfirmWipe((msg) => setProgressText(msg));
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar la base de datos.');
      setIsWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full border-2 border-rose-500/30 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            disabled={isWiping}
            className="absolute top-5 right-5 text-rose-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-700/80 rounded-2xl border border-rose-500/40 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-rose-100" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-700/40">
                Zona de Peligro Extremo
              </span>
              <h3 className="text-xl font-black text-white mt-0.5">
                Borrar Base de Datos Completa
              </h3>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-rose-700/50">
            <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? 'text-white' : step > 1 ? 'text-rose-300' : 'text-rose-400/60'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${step === 1 ? 'bg-white text-rose-900' : step > 1 ? 'bg-rose-400 text-rose-950' : 'bg-rose-950 text-rose-400'}`}>
                1
              </span>
              <span>Advertencia</span>
            </div>

            <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? 'text-white' : step > 2 ? 'text-rose-300' : 'text-rose-400/60'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${step === 2 ? 'bg-white text-rose-900' : step > 2 ? 'bg-rose-400 text-rose-950' : 'bg-rose-950 text-rose-400'}`}>
                2
              </span>
              <span>Frase Clave</span>
            </div>

            <div className={`flex items-center gap-2 text-xs font-bold ${step === 3 ? 'text-white' : 'text-rose-400/60'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${step === 3 ? 'bg-white text-rose-900' : 'bg-rose-950 text-rose-400'}`}>
                3
              </span>
              <span>Destrucción</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 flex-1 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: Advertencia y Resumen ================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-xl">
                <p className="text-sm font-bold text-rose-950">
                  ¡Atención! Esta acción es totalmente irreversible
                </p>
                <p className="text-xs text-rose-800 mt-1">
                  Se eliminarán de forma definitiva todos los datos almacenados en Firestore para la cuenta <strong>{userEmail || 'actual'}</strong>. No se podrán recuperar.
                </p>
              </div>

              {/* Data Summary Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2.5">
                  Registros que se van a destruir:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold">
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Empresas</span>
                    <span className="text-rose-600 text-lg font-black">{counts.empresas}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Contactos</span>
                    <span className="text-rose-600 text-lg font-black">{counts.contactos}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Interacciones</span>
                    <span className="text-rose-600 text-lg font-black">{counts.interacciones}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Relaciones</span>
                    <span className="text-rose-600 text-lg font-black">{counts.relaciones}</span>
                  </div>
                  <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase">Documentos</span>
                    <span className="text-rose-600 text-lg font-black">{counts.documentos}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-rose-500 block text-[10px] uppercase">Total Registros</span>
                    <span className="text-rose-700 text-lg font-black">{totalRecords}</span>
                  </div>
                </div>
              </div>

              {/* Recommendation to Backup */}
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/80 border border-indigo-150 rounded-2xl gap-3">
                <div className="text-xs">
                  <p className="font-bold text-indigo-950">¿Quieres descargar un respaldo antes?</p>
                  <p className="text-[11px] text-indigo-700">Guarda una copia completa en Excel de tus datos actuales.</p>
                </div>
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Excel</span>
                </button>
              </div>

              {/* Validation Checkbox */}
              <label className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={step1Agreed}
                  onChange={(e) => setStep1Agreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 leading-snug">
                  Entiendo que esta acción borrará permanentemente los <strong>{totalRecords} registros</strong> de mi base de datos sin posibilidad alguna de restaurarlos.
                </span>
              </label>
            </div>
          )}

          {/* ================= STEP 2: Frase Clave ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                <p className="text-sm font-bold text-amber-950">
                  Validación 2 de 3: Confirmación manual por texto
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Para asegurar que no se trata de un clic accidental, por favor escribe exactamente la frase de confirmación en mayúsculas en el recuadro inferior.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">
                  Escribe la siguiente frase para confirmar:
                </label>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-center font-mono font-black text-rose-700 tracking-wider text-sm select-all">
                  {SECURITY_PHRASE}
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder={`Escribe "${SECURITY_PHRASE}"`}
                  value={securityInput}
                  onChange={(e) => setSecurityInput(e.target.value)}
                  className={`w-full py-2.5 px-3.5 rounded-xl border text-sm font-mono font-bold outline-none transition-all ${
                    isPhraseValid
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                      : securityInput.length > 0
                      ? 'border-rose-400 bg-rose-50/30 text-rose-950'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-rose-500'
                  }`}
                />
                {isPhraseValid ? (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Frase verificada correctamente
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Distingue mayúsculas y minúsculas. Debe ser exactamente igual.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: Confirmación Final y Temporizador ================= */}
          {step === 3 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 bg-rose-100 border-2 border-rose-300 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">
                  Última confirmación (Paso 3 de 3)
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Al pulsar el botón inferior, se iniciará el proceso de eliminación física y definitiva de todos los datos en Firestore para la cuenta <strong>{userEmail}</strong>.
                </p>
              </div>

              {countdown > 0 && !isWiping && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl max-w-sm mx-auto">
                  <p className="text-xs font-bold text-amber-900">
                    Temporizador de seguridad activo:
                  </p>
                  <p className="text-2xl font-black text-amber-700 mt-1 font-mono">
                    00:0{countdown}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    El botón se activará automáticamente al terminar la cuenta atrás.
                  </p>
                </div>
              )}

              {isWiping && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl max-w-sm mx-auto space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-800">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                    <span>Eliminando datos de Firestore...</span>
                  </div>
                  <p className="text-xs font-mono text-rose-700">
                    {progressText || 'Procesando borrado irreversible...'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!step1Agreed}
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  step1Agreed
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <span>Validación 2 de 3</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
              <button
                type="button"
                disabled={!isPhraseValid}
                onClick={() => {
                  setStep(3);
                  setCountdown(5);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  isPhraseValid
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <span>Validación 3 de 3</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button
                type="button"
                disabled={isWiping}
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isWiping}
                onClick={handleExecuteWipe}
                className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 transition-all shadow-md ${
                  countdown > 0 || isWiping
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400/40'
                    : 'bg-rose-600 hover:bg-rose-700 active:scale-98 text-white cursor-pointer shadow-rose-900/30 hover:shadow-lg'
                }`}
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ELIMINANDO BASE DE DATOS...</span>
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ESPERA DE SEGURIDAD ({countdown}s)</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>DESTRUIR DEFINITIVAMENTE TODOS LOS DATOS</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


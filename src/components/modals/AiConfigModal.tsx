import React, { useState, useEffect } from 'react';
import { Sparkles, Key, Check, AlertCircle, X, ExternalLink, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const AiConfigModal: React.FC<AiConfigModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; source: string; model: string } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('gemini_api_key') || '';
      setApiKey(stored);
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/ai/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (e) {
      console.error('Error fetching AI status:', e);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const cleanKey = apiKey.trim();
      if (cleanKey) {
        localStorage.setItem('gemini_api_key', cleanKey);
      } else {
        localStorage.removeItem('gemini_api_key');
      }

      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      if (!res.ok) throw new Error('Error al guardar la configuración en el servidor');
      
      setMessage({
        type: 'success',
        text: cleanKey 
          ? '¡Clave de Gemini guardada con éxito! Las peticiones ahora usarán Gemini 2.5 Flash.' 
          : 'Clave eliminada. El sistema utilizará el motor analítico local integrado.'
      });
      await fetchStatus();
      if (onConfigSaved) onConfigSaved();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar la clave' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setApiKey('');
    localStorage.removeItem('gemini_api_key');
    setLoading(true);
    try {
      await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      });
      setMessage({
        type: 'success',
        text: 'Clave API eliminada. El sistema usará el motor analítico SRM integrado.'
      });
      await fetchStatus();
      if (onConfigSaved) onConfigSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Configuración de IA Gemini</h3>
              <p className="text-xs text-indigo-100 font-medium">Potencia el análisis de compras con Google Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Status Indicator Banner */}
          <div className="p-4 rounded-xl border bg-slate-50 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
              <Key className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Estado del Motor de IA:</span>
                {statusLoading ? (
                  <span className="text-[11px] text-slate-400 font-medium">Verificando...</span>
                ) : serverStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Google Gemini 2.5 Flash Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Motor Analítico SRM Local Activo
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-1 leading-relaxed">
                {serverStatus?.configured 
                  ? 'La IA está conectada a la API oficial de Google Gemini para generación en tiempo real.' 
                  : 'El SRM está funcionando con su motor analítico integrado. Funciona 100% sin clave, pero puedes añadir una clave de Gemini para respuestas aún más detalladas.'}
              </p>
            </div>
          </div>

          {/* Feedback messages */}
          {message && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {message.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Clave de API de Gemini (GEMINI_API_KEY)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400">Se guarda de forma segura en tu entorno local.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Obtener clave gratuita <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Helper Tips */}
          <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl p-3.5 text-xs text-indigo-950 space-y-1 leading-relaxed">
            <h5 className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Ventajas del Sistema Híbrido:
            </h5>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
              <li><strong>Con API Key:</strong> Informes ejecutivos generados por <em>Gemini 2.5 Flash</em> y categorización UNSPSC dinámica.</li>
              <li><strong>Sin API Key:</strong> Motor SRM analítico que genera diagnósticos, puntuaciones de salud y plantillas de correo al instante.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {apiKey ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar clave
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Guardar y Aplicar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

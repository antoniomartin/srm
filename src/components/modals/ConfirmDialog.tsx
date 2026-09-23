/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  state: ConfirmDialogState;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ state, onClose }) => {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                state.isDestructive
                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              }`}
            >
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">{state.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {state.message}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            {state.cancelLabel || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await state.onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition-all cursor-pointer ${
              state.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
            }`}
          >
            {state.confirmLabel || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
};

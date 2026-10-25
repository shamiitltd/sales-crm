import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          isSuccess
            ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-300'
            : isError
            ? 'bg-slate-900/95 border-rose-500/40 text-rose-300'
            : 'bg-slate-900/95 border-indigo-500/40 text-indigo-300'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-400" />}
        </div>

        <div className="flex-1 text-xs sm:text-sm">
          <p className="font-semibold text-white">{toast.title}</p>
          {toast.message && (
            <p className="text-slate-300 text-xs mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

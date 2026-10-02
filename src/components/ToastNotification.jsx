import React from 'react';
import { useWms } from '../context/WmsContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export default function ToastNotification() {
  const { notification, setNotification } = useWms();

  if (!notification) return null;

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-400 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-400 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-500/40 bg-emerald-950/95 text-emerald-50',
    warning: 'border-amber-500/40 bg-amber-950/95 text-amber-50',
    error: 'border-red-500/50 bg-red-950/95 text-red-50',
    info: 'border-blue-500/40 bg-slate-900/95 text-slate-100'
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] lg:bottom-5 z-50 animate-slideUp"
    >
      <div className={`p-4 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${borders[notification.type] || borders.info}`}>
        {icons[notification.type] || icons.info}
        <div className="flex-1 text-sm sm:text-xs font-medium leading-relaxed">
          {notification.message}
        </div>
        <button
          onClick={() => setNotification(null)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

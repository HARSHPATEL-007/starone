import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, any> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: "border-green-500/30 bg-green-500/10",
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
  info: "border-blue-500/30 bg-blue-500/10",
};

const ICON_COLORS: Record<ToastType, string> = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 p-3 rounded-lg border shadow-lg animate-slide-up ${COLORS[toast.type]}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{toast.title}</p>
                {toast.message && <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>}
              </div>
              <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

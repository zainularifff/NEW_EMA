import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

type EmaToastType = "success" | "error" | "warning" | "info";

type EmaToastItem = {
  id: number;
  type: EmaToastType;
  title: string;
  message?: string;
};

type EmaToastInput = {
  title: string;
  message?: string;
  type?: EmaToastType;
  duration?: number;
};

type EmaToastApi = {
  show: (toast: EmaToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const EmaToastContext = createContext<EmaToastApi | null>(null);

export function useEmaToast() {
  const context = useContext(EmaToastContext);

  if (!context) {
    throw new Error("useEmaToast must be used inside EmaToastProvider.");
  }

  return context;
}

export function EmaToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<EmaToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((toast: EmaToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const duration = toast.duration ?? 3200;

    setToasts((current) => [
      ...current,
      {
        id,
        type: toast.type ?? "info",
        title: toast.title,
        message: toast.message,
      },
    ]);

    window.setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const api = useMemo<EmaToastApi>(() => ({
    show,
    success: (title, message) => show({ type: "success", title, message }),
    error: (title, message) => show({ type: "error", title, message }),
    warning: (title, message) => show({ type: "warning", title, message }),
    info: (title, message) => show({ type: "info", title, message }),
  }), [show]);

  return (
    <EmaToastContext.Provider value={api}>
      {children}

      <div className="ema-toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div className={"ema-toast ema-toast-" + toast.type} key={toast.id}>
            <span className="ema-toast-dot" />
            <div>
              <strong>{toast.title}</strong>
              {toast.message && <small>{toast.message}</small>}
            </div>
            <button type="button" onClick={() => removeToast(toast.id)} aria-label="Close toast">
              ?
            </button>
          </div>
        ))}
      </div>
    </EmaToastContext.Provider>
  );
}

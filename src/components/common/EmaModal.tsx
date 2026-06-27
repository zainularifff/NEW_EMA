import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type EmaModalSize = "sm" | "md" | "lg" | "xl";

type EmaModalProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: EmaModalSize;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
  onClose: () => void;
};

export default function EmaModal({
  open,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnOverlay = true,
  onClose,
}: EmaModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.classList.add("ema-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("ema-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="ema-modal-layer" role="presentation">
      <button
        type="button"
        className="ema-modal-backdrop"
        aria-label="Close modal"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      <section className={"ema-modal ema-modal-" + size} role="dialog" aria-modal="true" aria-label={title}>
        <header className="ema-modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>

          <button type="button" className="ema-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="ema-modal-body">{children}</div>

        {footer && <footer className="ema-modal-footer">{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}

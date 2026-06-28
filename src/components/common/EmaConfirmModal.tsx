import { AlertTriangle, HelpCircle, Info } from "lucide-react";
import EmaModal from "./EmaModal";

type EmaConfirmTone = "danger" | "warning" | "info";

type EmaConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string;
  helperText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: EmaConfirmTone;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmIcon({ tone }: { tone: EmaConfirmTone }) {
  if (tone === "warning") return <AlertTriangle size={19} />;
  if (tone === "info") return <Info size={19} />;

  return <HelpCircle size={19} />;
}

export default function EmaConfirmModal({
  open,
  title = "Confirm action",
  message,
  helperText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onCancel,
  onConfirm,
}: EmaConfirmModalProps) {
  const fallbackHelper =
    tone === "danger"
      ? "This action cannot be undone."
      : tone === "warning"
        ? "Please review before continuing."
        : "Please confirm to continue.";

  return (
    <EmaModal
      open={open}
      title={title}
      size="sm"
      closeOnOverlay={!loading}
      onClose={loading ? () => undefined : onCancel}
      footer={
        <div>
          <button type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>

          <button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div>
        <div>
          <ConfirmIcon tone={tone} />
        </div>

        <div>
          <p>{message}</p>
          <small>{helperText || fallbackHelper}</small>
        </div>
      </div>
    </EmaModal>
  );
}

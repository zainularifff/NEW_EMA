import EmaModal from "./EmaModal";

type EmaConfirmTone = "danger" | "warning" | "info";

type EmaConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: EmaConfirmTone;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function EmaConfirmModal({
  open,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onCancel,
  onConfirm,
}: EmaConfirmModalProps) {
  return (
    <EmaModal
      open={open}
      title={title}
      description={message}
      size="sm"
      closeOnOverlay={!loading}
      onClose={loading ? () => undefined : onCancel}
      footer={
        <div className="ema-modal-actions">
          <button type="button" className="ema-btn ema-btn-light" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className={"ema-btn ema-btn-" + tone} onClick={onConfirm} disabled={loading}>
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className={"ema-confirm-icon ema-confirm-" + tone}>
        <span>!</span>
      </div>
    </EmaModal>
  );
}

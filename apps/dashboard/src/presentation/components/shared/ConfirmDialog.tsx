import { Modal } from './Modal';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  open,
  title,
  description,
  target,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  target?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description="Confirm this action"
      size="sm"
      dismissDisabled={busy}
      footer={
        <div className={styles.actions}>
          <button className={styles.cancel} type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={styles.confirm} type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className={styles.message}>{description}</p>
      {target ? <p className={styles.target}>{target}</p> : null}
    </Modal>
  );
}

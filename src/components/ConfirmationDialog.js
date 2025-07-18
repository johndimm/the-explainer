import styles from '../styles/ConfirmationDialog.module.css';

export default function ConfirmationDialog({ isOpen, onConfirm, onCancel, title, message }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>{title}</h3>
        </div>
        <div className={styles.message}>
          <p>{message}</p>
        </div>
        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
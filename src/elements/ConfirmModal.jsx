import '../styles/ConfirmModal.css'

function ConfirmModal({
  open,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Yes',
  showCancel = true,
  onCancel,
  onConfirm,
}) {
  if (!open) return null

  return (
    <div className="confirm-overlay" onClick={showCancel ? onCancel : undefined}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        {message ? <div className="confirm-message">{message}</div> : null}
        <div className="confirm-actions">
          {showCancel ? (
            <button className="confirm-btn cancel" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          ) : null}
          <button className="confirm-btn confirm" type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal

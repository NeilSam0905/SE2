import { useState, useEffect } from 'react'
import '../styles/ConfirmModal.css'

function ConfirmModal({
  open,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Yes',
  showCancel = true,
  requireReason = false, 
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])

  if (!open) return null

  const handleConfirm = () => {
    onConfirm(reason)
  }

  return (
    <div className="confirm-overlay" onClick={showCancel ? onCancel : undefined}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">{title}</div>
        {message ? <div className="confirm-message">{message}</div> : null}
        
        {requireReason && (
          <div className="confirm-input-group" style={{ marginTop: '12px' }}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please enter a reason for cancellation..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        <div className="confirm-actions" style={{ marginTop: '16px' }}>
          {showCancel ? (
            <button className="confirm-btn cancel" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          ) : null}
          <button 
            className="confirm-btn confirm" 
            type="button" 
            onClick={handleConfirm}
            disabled={requireReason && !reason.trim()} 
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
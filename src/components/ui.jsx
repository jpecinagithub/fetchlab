import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export async function copyText(text) {
  const s = String(text ?? '');
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Rendered via portal so no ancestor stacking context, transform or overflow
  // can ever misplace the overlay or let page content paint above it.
  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function CopyButton({ text, label, onCopied, className }) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm ${className || ''}`}
      onClick={async () => {
        if (await copyText(text)) onCopied?.();
      }}
      title={label}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="5" width="8" height="8" rx="1.5" />
        <path d="M11 5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5.5A1.5 1.5 0 0 0 4 11h1" />
      </svg>
      {label}
    </button>
  );
}

export function ConfirmDialog({ title, detail, confirmLabel, cancelLabel, onConfirm, onClose, danger }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-detail">{detail}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

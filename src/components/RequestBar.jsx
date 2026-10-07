import React from 'react';
import { METHODS } from '../lib/apiClient.js';

const TIMEOUTS = [10, 30, 60, 0];

export default function RequestBar({ request, onPatch, sending, onSend, onCancel, t, onCopyUrl, onClear }) {
  return (
    <div className="request-bar" role="group" aria-label={t('urlLabel')}>
      <select
        className={`method-select m-${request.method}`}
        value={request.method}
        onChange={(e) => onPatch({ method: e.target.value })}
        aria-label={t('method')}
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        className="url-input"
        type="url"
        spellCheck={false}
        autoComplete="off"
        placeholder={t('urlPlaceholder')}
        value={request.url}
        onChange={(e) => onPatch({ url: e.target.value }, true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !sending) onSend();
        }}
        aria-label={t('urlLabel')}
      />
      <select
        className="timeout-select"
        value={request.timeout}
        onChange={(e) => onPatch({ timeout: Number(e.target.value) })}
        aria-label={t('optionsTimeoutLabel')}
        title={t('optionsTimeoutLabel')}
      >
        {TIMEOUTS.map((s) => (
          <option key={s} value={s}>
            {s === 0 ? t('timeoutNone') : `${s} ${t('sec')}`}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="icon-btn"
        onClick={onCopyUrl}
        title={t('copyUrl')}
        aria-label={t('copyUrl')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M11 5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5.5A1.5 1.5 0 0 0 4 11h1" />
        </svg>
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={onClear}
        title={t('clearRequest')}
        aria-label={t('clearRequest')}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5h10M6.5 5V3.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V5M5 5l.7 8a1 1 0 0 0 1 .9h2.6a1 1 0 0 0 1-.9L11 5" />
        </svg>
      </button>
      {sending ? (
        <button type="button" className="btn btn-danger btn-send" onClick={onCancel}>
          {t('cancel')}
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-send"
          onClick={onSend}
          title={t('sendHint')}
        >
          {t('send')}
        </button>
      )}
    </div>
  );
}

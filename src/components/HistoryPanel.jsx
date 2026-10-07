import React, { useState } from 'react';
import { Modal, CopyButton, ConfirmDialog } from './ui.jsx';
import { formatBytes, formatDuration, formatTimestamp, statusClass } from '../lib/format.js';
import { REDACTED } from '../lib/security.js';

function shortPath(url) {
  try {
    const u = new URL(url);
    const p = u.pathname + u.search;
    return p.length > 48 ? p.slice(0, 47) + '…' : p;
  } catch {
    return String(url).length > 48 ? String(url).slice(0, 47) + '…' : String(url);
  }
}

function KvTable({ rows, emptyNote }) {
  const list = (rows || []).filter((r) => String(r.key || '').trim() !== '');
  if (!list.length) return <p className="editor-hint">{emptyNote}</p>;
  return (
    <div className="detail-kv">
      {list.map((r) => (
        <div className="detail-kv-row" key={r.id}>
          <span className="detail-kv-key">{r.key}</span>
          <span className={`detail-kv-val ${r.value === REDACTED ? 'redacted' : ''}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function DetailModal({ entry, t, onClose, onRunAgain, onDuplicate, onDelete, onCopyCurl, onRename }) {
  const { request: req, response: res } = entry;
  const [name, setName] = useState(entry.name || '');
  const saveName = () => onRename(entry.id, name.trim());
  const bodyPreview =
    res.kind === 'json'
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(res.body), null, 2);
          } catch {
            return res.body;
          }
        })()
      : res.body;

  return (
    <Modal title={entry.name || `${req.method} ${shortPath(req.url)}`} onClose={onClose} wide>
      <div className="detail-name-row">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveName();
          }}
          placeholder={t('callName')}
          aria-label={t('callName')}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={saveName}>
          {t('save')}
        </button>
      </div>
      <div className="detail-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onRunAgain}>
          {t('runAgain')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate}>
          {t('duplicate')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCopyCurl}>
          {t('copyAsCurl')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger-ghost" onClick={onDelete}>
          {t('deleteEntry')}
        </button>
      </div>

      <h3 className="detail-h">{t('requestDetails')}</h3>
      <dl className="detail-grid">
        <dt>{t('method')}</dt>
        <dd>
          <span className={`method-pill m-${req.method}`}>{req.method}</span>
        </dd>
        <dt>{t('url')}</dt>
        <dd className="mono break">{req.url}</dd>
        <dt>{t('timestamp')}</dt>
        <dd>{formatTimestamp(entry.timestamp)}</dd>
      </dl>
      <h4 className="detail-sub">{t('queryParams')}</h4>
      <KvTable rows={req.params} emptyNote={t('noBody')} />
      <h4 className="detail-sub">{t('requestHeaders')}</h4>
      <KvTable rows={req.headers} emptyNote={t('noBody')} />
      {req.auth && req.auth.type !== 'none' && (
        <>
          <h4 className="detail-sub">{t('tabAuth')}</h4>
          <p className="mono">
            {req.auth.type} <span className="redacted">{t('redactedNote')}</span>
          </p>
        </>
      )}
      {req.body && req.body.type !== 'none' && (
        <>
          <h4 className="detail-sub">
            {t('requestBody')} ({req.body.type})
          </h4>
          <pre className="code-block code-block-sm">
            {req.body.type === 'json'
              ? req.body.json
              : req.body.type === 'text'
              ? req.body.text
              : req.body.type === 'urlencoded'
              ? (req.body.urlencoded || []).map((r) => `${r.key}=${r.value}`).join('\n')
              : (req.body.form || []).map((r) => `${r.key}=${r.value}`).join('\n')}
          </pre>
        </>
      )}

      <h3 className="detail-h">{t('responseDetails')}</h3>
      <div className="metrics">
        <span className={`status-pill st-${statusClass(res.status)}`}>
          {res.status} {res.statusText}
        </span>
        <span className="metric">
          <span className="metric-label">{t('time')}</span> {formatDuration(res.duration)}
        </span>
        <span className="metric">
          <span className="metric-label">{t('size')}</span> {formatBytes(res.size)}
        </span>
        {res.truncated && <span className="metric metric-warn">{t('truncatedNote')}</span>}
      </div>
      <h4 className="detail-sub">{t('responseHeaders')}</h4>
      <div className="detail-kv">
        {Object.entries(res.headers || {}).map(([k, v]) => (
          <div className="detail-kv-row" key={k}>
            <span className="detail-kv-key">{k}</span>
            <span className={`detail-kv-val ${v === REDACTED ? 'redacted' : ''}`}>{v}</span>
          </div>
        ))}
      </div>
      <h4 className="detail-sub">{t('responseBody')}</h4>
      <pre className="code-block code-block-sm">{bodyPreview || t('noBody')}</pre>
    </Modal>
  );
}

export default function HistoryPanel({
  history,
  t,
  notify,
  onLoad,
  onDelete,
  onClear,
  onCopyCurl,
  onRename,
}) {
  const [detail, setDetail] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="history-panel">
      <div className="history-head">
        <span className="history-count">
          {history.length} / 50
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-danger-ghost"
          onClick={() => setConfirmClear(true)}
          disabled={!history.length}
        >
          {t('clearHistory')}
        </button>
      </div>

      {history.length === 0 ? (
        <p className="history-empty">{t('historyEmpty')}</p>
      ) : (
        <ul className="history-list">
          {history.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="history-item"
                onClick={() => setDetail(e)}
                aria-label={`${e.request.method} ${e.request.url}`}
              >
                <span className={`method-pill m-${e.request.method}`}>{e.request.method}</span>
                <span className="history-main">
                  <span className={`history-path ${e.name ? '' : 'mono'}`}>
                    {e.name || shortPath(e.request.url)}
                  </span>
                  <span className="history-meta">
                    <span className={`status-dot st-${statusClass(e.response.status)}`} />
                    {e.response.status} · {formatDuration(e.response.duration)} ·{' '}
                    {formatTimestamp(e.timestamp)}
                  </span>
                </span>
                <span
                  className="icon-btn icon-btn-sm history-del"
                  role="button"
                  tabIndex={0}
                  aria-label={t('deleteEntry')}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onDelete(e.id);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.stopPropagation();
                      onDelete(e.id);
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l10 10M13 3L3 13" />
                  </svg>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="history-note">{t('historyNote')}</p>

      {detail && (
        <DetailModal
          entry={detail}
          t={t}
          onClose={() => setDetail(null)}
          onRunAgain={() => {
            onLoad(detail.request);
            setDetail(null);
          }}
          onDuplicate={() => {
            onLoad(detail.request);
            setDetail(null);
          }}
          onDelete={() => {
            onDelete(detail.id);
            setDetail(null);
          }}
          onCopyCurl={() => onCopyCurl(detail.request)}
          onRename={(id, newName) => {
            onRename(id, newName);
            setDetail((d) => (d && d.id === id ? { ...d, name: newName || undefined } : d));
          }}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title={t('clearHistoryConfirm')}
          detail={t('clearHistoryDetail')}
          confirmLabel={t('confirmDelete')}
          cancelLabel={t('confirmCancel')}
          danger
          onConfirm={() => {
            onClear();
            setConfirmClear(false);
          }}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}

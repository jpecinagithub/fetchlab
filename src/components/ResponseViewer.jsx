import React, { useEffect, useMemo, useState } from 'react';
import JsonView from './JsonView.jsx';
import { CopyButton } from './ui.jsx';
import { formatBytes, formatDuration, statusClass, tryPrettyJson } from '../lib/format.js';

const ERROR_KEYS = {
  'invalid-url': 'errInvalidUrl',
  'invalid-json': 'errInvalidJson',
  timeout: 'errTimeout',
  cancelled: 'errCancelled',
  network: 'errNetwork',
  cors: 'errCors',
  dns: 'errDns',
  unknown: 'errUnknown',
};

export function errorMessage(err, t) {
  const key = ERROR_KEYS[err?.kind] || ERROR_KEYS.unknown;
  return t(key);
}

function Metrics({ response, t }) {
  return (
    <div className="metrics">
      <span className={`status-pill st-${statusClass(response.status)}`}>
        {response.status} {response.statusText}
      </span>
      <span className="metric" title={t('time')}>
        <span className="metric-label">{t('time')}</span> {formatDuration(response.duration)}
      </span>
      <span className="metric" title={t('size')}>
        <span className="metric-label">{t('size')}</span> {formatBytes(response.size)}
      </span>
      {response.truncated && <span className="metric metric-warn">{t('truncatedNote')}</span>}
    </div>
  );
}

export default function ResponseViewer({ response, error, sending, t, notify }) {
  const [tab, setTab] = useState('body');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [treeCmd, setTreeCmd] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search ]);

  useEffect(() => {
    setSearch('');
    setTab('body');
  }, [response]);

  const parsed = useMemo(
    () => (response && response.kind === 'json' ? tryPrettyJson(response.body) : { ok: false }),
    [response]
  );

  if (sending) {
    return (
      <div className="response-pane">
        <div className="resp-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-pane">
        <div className="resp-error" role="alert">
          <div className="resp-error-title">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 5v3.5M8 11.2v.1" strokeLinecap="round" />
            </svg>
            {t('response')}
          </div>
          <p>{errorMessage(error, t)}</p>
          {error.detail && <p className="resp-error-detail">{error.detail}</p>}
        </div>
      </div>
    );
  }

  if (!response) return null;

  const headerEntries = Object.entries(response.headers || {});
  const copyHeadersText = headerEntries.map(([k, v]) => `${k}: ${v}`).join('\n');

  return (
    <div className="response-pane">
      <div className="resp-top">
        <h2 className="pane-title">{t('response')}</h2>
        <Metrics response={response} t={t} />
      </div>

      <div className="resp-tabs-row">
        <div className="tabs" role="tablist" aria-label={t('response')}>
          {['body', 'headers', 'raw'].map((tb) => (
            <button
              key={tb}
              type="button"
              role="tab"
              aria-selected={tab === tb}
              className={`tab ${tab === tb ? 'tab-active' : ''}`}
              onClick={() => setTab(tb)}
            >
              {t(tb === 'body' ? 'respBody' : tb === 'headers' ? 'respHeaders' : 'respRaw')}
              {tb === 'headers' && <span className="tab-badge">{headerEntries.length}</span>}
            </button>
          ))}
        </div>
        <div className="resp-actions">
          {tab === 'body' && response.kind === 'json' && (
            <>
              <input
                className="input input-sm resp-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchResponse')}
                aria-label={t('searchResponse')}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setTreeCmd({ mode: 'expand', n: Date.now() })}
              >
                {t('expandAll')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setTreeCmd({ mode: 'collapse', n: Date.now() })}
              >
                {t('collapseAll')}
              </button>
            </>
          )}
          <CopyButton
            text={tab === 'headers' ? copyHeadersText : response.body}
            label={tab === 'headers' ? t('copyHeaders') : t('copyResponse')}
            onCopied={() => notify(t('copied'))}
          />
        </div>
      </div>

      <div className="resp-content">
        {tab === 'body' && response.kind === 'json' && parsed.ok && (
          <JsonView data={parsed.value} search={debounced} treeCmd={treeCmd} />
        )}
        {tab === 'body' && response.kind !== 'json' && (
          <>
            {response.kind === 'html' && <p className="editor-hint">{t('htmlSourceNote')}</p>}
            <pre className="code-block" dir="ltr">
              {response.body || t('noBody')}
            </pre>
          </>
        )}
        {tab === 'headers' && (
          <div className="resp-headers">
            {headerEntries.length === 0 && <p className="editor-hint">{t('noBody')}</p>}
            {headerEntries.map(([k, v]) => (
              <div className="resp-header-row" key={k}>
                <span className="resp-header-key">{k}</span>
                <span className="resp-header-val">{v}</span>
                <CopyButton text={v} label="" onCopied={() => notify(t('copied'))} className="copy-mini" />
              </div>
            ))}
          </div>
        )}
        {tab === 'raw' && (
          <pre className="code-block" dir="ltr" aria-label={t('rawTabHint')}>
            {response.body || t('noBody')}
          </pre>
        )}
      </div>
    </div>
  );
}

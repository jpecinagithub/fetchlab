import React, { useCallback, useEffect, useRef, useState } from 'react';
import RequestBar from './components/RequestBar.jsx';
import ParamsEditor from './components/ParamsEditor.jsx';
import HeadersEditor from './components/HeadersEditor.jsx';
import AuthEditor from './components/AuthEditor.jsx';
import BodyEditor from './components/BodyEditor.jsx';
import ResponseViewer from './components/ResponseViewer.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import { Modal, copyText } from './components/ui.jsx';
import { newKvRow } from './components/KvEditor.jsx';
import { executeRequest, buildFetchInput, METHODS_WITH_BODY } from './lib/apiClient.js';
import {
  historyAdd,
  historyList,
  historyDelete,
  historyClear,
  examplesAdd,
  examplesList,
  examplesDelete,
} from './lib/idb.js';
import { sanitizeForHistory, REDACTED } from './lib/security.js';
import { parseCurl, requestToCurl } from './lib/curl.js';
import { EXAMPLES } from './lib/examples.js';
import { t, SUPPORTED_LANGS } from './lib/i18n.js';

const blankRequest = () => ({
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  auth: { type: 'none' },
  body: { type: 'none', json: '', text: '', form: [], urlencoded: [] },
  timeout: 30,
});

function parseQueryToRows(url) {
  try {
    const u = new URL(url);
    const rows = [];
    u.searchParams.forEach((value, key) => rows.push(newKvRow(key, value)));
    return rows;
  } catch {
    return null;
  }
}

function snapshotRequest(req) {
  return JSON.parse(
    JSON.stringify({
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      auth: req.auth,
      body: req.body,
    })
  );
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `h${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const THEME_KEY = 'fetchlab-theme';
const LANG_KEY = 'fetchlab-lang';

export default function App() {
  const [request, setRequest] = useState(blankRequest);
  const [response, setResponse] = useState(null);
  const [reqError, setReqError] = useState(null);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('params');
  const [history, setHistory] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('history');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [customExamples, setCustomExamples] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'system');
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'en');
  const [installEvt, setInstallEvt] = useState(null);

  const abortRef = useRef(null);
  const requestRef = useRef(request);
  const importOpenRef = useRef(false);
  const toastTimer = useRef(null);

  const tr = useCallback((key) => t(SUPPORTED_LANGS.includes(lang) ? lang : 'en', key), [lang]);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);
  useEffect(() => {
    importOpenRef.current = importOpen;
  }, [importOpen]);

  // The Body tab only exists for methods that support one.
  useEffect(() => {
    if (activeTab === 'body' && !METHODS_WITH_BODY.has(request.method)) {
      setActiveTab('params');
    }
  }, [request.method, activeTab]);

  const notify = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1600);
  }, []);

  // Theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const apply = () => {
      const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = resolved === 'dark' ? '#0f141b' : '#ffffff';
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  // Language
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // History + saved examples load
  useEffect(() => {
    historyList().then(setHistory).catch(() => setHistory([]));
    examplesList().then(setCustomExamples).catch(() => setCustomExamples([]));
  }, []);

  // PWA install prompt
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const send = useCallback(async () => {
    if (abortRef.current) return;
    setReqError(null);
    setResponse(null);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const secs = requestRef.current.timeout;
    let timer = null;
    if (secs > 0) {
      timer = setTimeout(() => {
        try {
          controller.abort('timeout');
        } catch {
          /* noop */
        }
      }, secs * 1000);
    }
    try {
      const res = await executeRequest(requestRef.current, controller.signal);
      setResponse(res);
      // History: ONLY exact HTTP 200, sanitized, capped at 50.
      if (res.status === 200) {
        try {
          const entry = sanitizeForHistory({
            id: newId(),
            timestamp: Date.now(),
            request: snapshotRequest(requestRef.current),
            response: res,
          });
          await historyAdd(entry);
          setHistory(await historyList());
        } catch {
          /* history is best-effort; the response still shows */
        }
      }
    } catch (e) {
      setReqError(e && e.kind ? e : { kind: 'unknown' });
    } finally {
      if (timer) clearTimeout(timer);
      abortRef.current = null;
      setSending(false);
    }
  }, []);

  const cancel = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
  }, []);

  // Ctrl/Cmd + Enter to send
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !importOpenRef.current) {
        e.preventDefault();
        send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);

  const applyPatch = (patch, urlEdited = false) => {
    setRequest((prev) => {
      const next = { ...prev, ...patch };
      if (urlEdited && typeof patch.url === 'string') {
        const rows = parseQueryToRows(patch.url);
        if (rows) next.params = rows;
      }
      return next;
    });
  };

  const setParams = (rows) => {
    setRequest((prev) => {
      let urlStr = prev.url;
      try {
        const u = new URL(prev.url);
        u.search = '';
        rows
          .filter((r) => r.enabled && String(r.key || '').trim() !== '')
          .forEach((r) => u.searchParams.append(r.key, r.value ?? ''));
        urlStr = u.toString();
      } catch {
        /* keep the URL as typed */
      }
      return { ...prev, params: rows, url: urlStr };
    });
  };

  // History entries store secrets as [REDACTED]. When loading one back into the
  // editor, blank those fields so it is obvious the credential must be re-entered
  // instead of sending the literal "[REDACTED]" string.
  const scrubRedacted = (req) => {
    const cleanRows = (rows) =>
      (rows || []).map((r) => (r.value === REDACTED ? { ...r, value: '' } : r));
    const out = { ...req, headers: cleanRows(req.headers), params: cleanRows(req.params) };
    if (out.auth) {
      out.auth = { ...out.auth };
      if (out.auth.bearer === REDACTED) out.auth.bearer = '';
      if (out.auth.basicPass === REDACTED) out.auth.basicPass = '';
      if (out.auth.apiKey === REDACTED) out.auth.apiKey = '';
    }
    return out;
  };

  const loadRequest = (req) => {
    setRequest(scrubRedacted(JSON.parse(JSON.stringify({ ...blankRequest(), ...req }))));
    setResponse(null);
    setReqError(null);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const doImportCurl = () => {
    try {
      const parsed = parseCurl(importText);
      loadRequest(parsed);
      setImportOpen(false);
      setImportText('');
      setImportError('');
      notify(tr('copied'));
    } catch {
      setImportError(tr('importCurlError'));
    }
  };

  const doCopyCurl = async (req) => {
    try {
      const effective = buildFetchInput(req || requestRef.current);
      if (await copyText(requestToCurl(req || requestRef.current, effective))) {
        notify(tr('copied'));
      }
    } catch {
      notify(tr('errInvalidUrl'));
    }
  };

  const suggestedName = () => {
    const req = requestRef.current;
    try {
      const u = new URL(req.url);
      const path = u.pathname && u.pathname !== '/' ? u.pathname : '';
      return `${req.method} ${u.hostname}${path}`;
    } catch {
      return req.method ? `${req.method} request` : '';
    }
  };

  const shortExampleUrl = (url) => {
    try {
      const u = new URL(url);
      const p = u.hostname + (u.pathname !== '/' ? u.pathname : '') + u.search;
      return p.length > 52 ? p.slice(0, 51) + '…' : p;
    } catch {
      return String(url).length > 52 ? String(url).slice(0, 51) + '…' : String(url);
    }
  };

  const doSaveExample = async () => {
    const name = saveName.trim();
    if (!name) return;
    try {
      await examplesAdd({
        id: newId(),
        name,
        timestamp: Date.now(),
        request: snapshotRequest(requestRef.current),
      });
      setCustomExamples(await examplesList());
      setSaveOpen(false);
      setSaveName('');
      setSidebarTab('examples');
      notify(tr('saved'));
    } catch {
      notify(tr('errUnknown'));
    }
  };

  const showEmpty = !response && !reqError && !sending;
  const paramCount = request.params.filter((r) => String(r.key || '').trim() !== '').length;
  const headerCount = request.headers.filter((r) => String(r.key || '').trim() !== '').length;

  const tabs = [
    { id: 'params', label: tr('tabParams'), badge: paramCount || null },
    { id: 'headers', label: tr('tabHeaders'), badge: headerCount || null },
    { id: 'auth', label: tr('tabAuth'), dot: request.auth.type !== 'none' },
    { id: 'body', label: tr('tabBody'), disabled: !METHODS_WITH_BODY.has(request.method) },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn hamburger"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Menu"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4h12M2 8h12M2 12h12" />
          </svg>
        </button>
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            {'>_'}
          </span>
          <span className="brand-name">{tr('appName')}</span>
          <span className="brand-tag">{tr('tagline')}</span>
        </div>
        <div className="topbar-actions">
          {installEvt && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                installEvt.prompt();
                setInstallEvt(null);
              }}
            >
              {tr('installApp')}
            </button>
          )}
          <select
            className="select select-sm"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={tr('language')}
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
          <select
            className="select select-sm"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            aria-label={tr('theme')}
          >
            <option value="system">{tr('themeSystem')}</option>
            <option value="light">{tr('themeLight')}</option>
            <option value="dark">{tr('themeDark')}</option>
          </select>
        </div>
      </header>

      <div className="layout">
        {sidebarOpen && (
          <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="tabs sidebar-tabs" role="tablist">
            {['history', 'examples'].map((st) => (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={sidebarTab === st}
                className={`tab ${sidebarTab === st ? 'tab-active' : ''}`}
                onClick={() => setSidebarTab(st)}
              >
                {tr(st)}
                {st === 'history' && history.length > 0 && (
                  <span className="tab-badge">{history.length}</span>
                )}
              </button>
            ))}
          </div>
          {sidebarTab === 'history' ? (
            <HistoryPanel
              history={history}
              t={tr}
              notify={notify}
              onLoad={loadRequest}
              onDelete={async (id) => {
                await historyDelete(id);
                setHistory(await historyList());
              }}
              onClear={async () => {
                await historyClear();
                setHistory([]);
              }}
              onCopyCurl={doCopyCurl}
            />
          ) : (
            <div className="examples-panel">
              <h4 className="examples-h">
                {tr('myExamples')}
                {customExamples.length > 0 && (
                  <span className="tab-badge">{customExamples.length}</span>
                )}
              </h4>
              {customExamples.length === 0 ? (
                <p className="editor-hint">{tr('noCustomExamples')}</p>
              ) : (
                <ul className="examples-list">
                  {customExamples.map((ex) => (
                    <li key={ex.id} className="example-item">
                      <button
                        type="button"
                        className="example-load"
                        onClick={() => loadRequest(ex.request)}
                        aria-label={ex.name}
                      >
                        <span className={`method-pill m-${ex.request.method}`}>
                          {ex.request.method}
                        </span>
                        <span className="example-text">
                          <span className="example-title">{ex.name}</span>
                          <span className="example-desc mono">
                            {shortExampleUrl(ex.request.url)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-sm"
                        aria-label={tr('deleteEntry')}
                        title={tr('deleteEntry')}
                        onClick={async () => {
                          await examplesDelete(ex.id);
                          setCustomExamples(await examplesList());
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3l10 10M13 3L3 13" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <h4 className="examples-h">{tr('builtInExamples')}</h4>
              <p className="editor-hint">{tr('examplesSubtitle')}</p>
              <ul className="examples-list">
                {EXAMPLES.map((ex) => (
                  <li key={ex.id}>
                    <button
                      type="button"
                      className="example-item"
                      onClick={() => loadRequest(ex.request)}
                    >
                      <span className={`method-pill m-${ex.method}`}>{ex.method}</span>
                      <span className="example-text">
                        <span className="example-title">{tr(ex.titleKey)}</span>
                        <span className="example-desc">{tr(ex.descKey)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="sidebar-foot">
            <span>{tr('builtBy')}</span>
            <a href="mailto:jpecina@gmail.com">jpecina@gmail.com</a>
          </div>
        </aside>

        <main className="main">
          <RequestBar
            request={request}
            onPatch={applyPatch}
            sending={sending}
            onSend={send}
            onCancel={cancel}
            t={tr}
            onCopyUrl={async () => {
              if (await copyText(request.url)) notify(tr('copied'));
            }}
            onClear={() => {
              loadRequest(blankRequest());
            }}
          />

          <div className="req-tabs-row">
            <div className="tabs" role="tablist" aria-label="Request">
              {tabs.map((tb) =>
                tb.disabled ? null : (
                  <button
                    key={tb.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tb.id}
                    className={`tab ${activeTab === tb.id ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab(tb.id)}
                  >
                    {tb.label}
                    {tb.badge ? <span className="tab-badge">{tb.badge}</span> : null}
                    {tb.dot ? <span className="tab-dot" aria-hidden="true" /> : null}
                  </button>
                )
              )}
            </div>
            <div className="req-tools">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>
                {tr('importCurl')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => doCopyCurl()}>
                {tr('copyAsCurl')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!request.url.trim()}
                title={tr('saveExample')}
                onClick={() => {
                  setSaveName(suggestedName());
                  setSaveOpen(true);
                }}
              >
                {tr('saveExample')}
              </button>
            </div>
          </div>

          <section className="req-panel" aria-live="polite">
            {activeTab === 'params' && (
              <ParamsEditor rows={request.params} onChange={setParams} t={tr} />
            )}
            {activeTab === 'headers' && (
              <HeadersEditor
                rows={request.headers}
                onChange={(rows) => applyPatch({ headers: rows })}
                t={tr}
              />
            )}
            {activeTab === 'auth' && (
              <AuthEditor
                auth={request.auth}
                onChange={(auth) => applyPatch({ auth })}
                t={tr}
              />
            )}
            {activeTab === 'body' && METHODS_WITH_BODY.has(request.method) && (
              <BodyEditor body={request.body} onChange={(body) => applyPatch({ body })} t={tr} />
            )}
          </section>

          <section className="resp-section">
            {showEmpty ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2>{tr('emptyStateTitle')}</h2>
                <p>{tr('emptyStateText')}</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setSidebarTab('examples');
                    setSidebarOpen(true);
                  }}
                >
                  {tr('tryExample')}
                </button>
                <p className="empty-hint">{tr('sendHint')}</p>
              </div>
            ) : (
              <ResponseViewer
                response={response}
                error={reqError}
                sending={sending}
                t={tr}
                notify={notify}
              />
            )}
          </section>

          <footer className="main-foot">
            <span>{tr('footerNote')}</span>
          </footer>
        </main>
      </div>

      {importOpen && (
        <Modal title={tr('importCurlTitle')} onClose={() => setImportOpen(false)} wide>
          <textarea
            className="textarea import-textarea"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError('');
            }}
            placeholder={tr('importCurlPlaceholder')}
            rows={8}
            spellCheck={false}
            aria-label={tr('importCurlTitle')}
          />
          {importError && (
            <p className="json-error" role="alert">
              {importError}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(false)}>
              {tr('confirmCancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={doImportCurl}>
              {tr('importCurlButton')}
            </button>
          </div>
        </Modal>
      )}

      {saveOpen && (
        <Modal title={tr('saveExample')} onClose={() => setSaveOpen(false)}>
          <label className="field-label" htmlFor="example-name">
            {tr('exampleName')}
          </label>
          <input
            id="example-name"
            className="input"
            value={saveName}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder={tr('exampleNamePlaceholder')}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSaveExample();
            }}
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setSaveOpen(false)}>
              {tr('confirmCancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!saveName.trim()}
              onClick={doSaveExample}
            >
              {tr('save')}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

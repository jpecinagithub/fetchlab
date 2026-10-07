import React, { useRef, useState } from 'react';
import KvEditor, { newKvRow } from './KvEditor.jsx';

const BODY_TYPES = ['none', 'json', 'text', 'form', 'urlencoded'];

/** Tiny JSON syntax highlighter producing safe HTML (input is escaped first). */
export function highlightJsonHtml(text) {
  const esc = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g,
    (m, str, _e, colon, bool) => {
      let cls = 'tok-num';
      if (str) cls = colon ? 'tok-key' : 'tok-str';
      else if (bool) cls = m === 'null' ? 'tok-null' : 'tok-bool';
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

function JsonCodeEditor({ value, onChange, t, error }) {
  const preRef = useRef(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });

  return (
    <div className={`code-editor ${error ? 'code-error' : ''}`}>
      <pre
        ref={preRef}
        aria-hidden="true"
        className="code-highlight"
        style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}
        dangerouslySetInnerHTML={{ __html: highlightJsonHtml(value) + '\n' }}
      />
      <textarea
        className="code-input"
        value={value}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        wrap="off"
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => setScroll({ top: e.target.scrollTop, left: e.target.scrollLeft })}
        aria-label="JSON body"
        placeholder={'{\n  "name": "Jon"\n}'}
      />
    </div>
  );
}

export default function BodyEditor({ body, onChange, t }) {
  const set = (patch) => onChange({ ...body, ...patch });
  const [jsonError, setJsonError] = useState('');

  const onJsonChange = (v) => {
    set({ json: v });
    if (!v.trim()) {
      setJsonError('');
      return;
    }
    try {
      JSON.parse(v);
      setJsonError('');
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const formatJson = () => {
    try {
      set({ json: JSON.stringify(JSON.parse(body.json), null, 2) });
      setJsonError('');
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const minifyJson = () => {
    try {
      set({ json: JSON.stringify(JSON.parse(body.json)) });
      setJsonError('');
    } catch (e) {
      setJsonError(e.message);
    }
  };

  const labelFor = (bt) =>
    t(
      bt === 'none'
        ? 'bodyNone'
        : bt === 'json'
        ? 'bodyJson'
        : bt === 'text'
        ? 'bodyText'
        : bt === 'form'
        ? 'bodyForm'
        : 'bodyUrlencoded'
    );

  return (
    <div className="body-editor">
      <div className="segmented" role="tablist" aria-label={t('bodyType')}>
        {BODY_TYPES.map((bt) => (
          <button
            key={bt}
            type="button"
            role="tab"
            aria-selected={body.type === bt}
            className={`seg-btn ${body.type === bt ? 'seg-active' : ''}`}
            onClick={() => set({ type: bt })}
          >
            {labelFor(bt)}
          </button>
        ))}
      </div>

      {body.type === 'json' && (
        <div>
          <div className="body-toolbar">
            <button type="button" className="btn btn-ghost btn-sm" onClick={formatJson}>
              {t('formatJson')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={minifyJson}>
              {t('minifyJson')}
            </button>
            {jsonError && (
              <span className="json-error" role="alert">
                {t('invalidJson')}: {jsonError}
              </span>
            )}
          </div>
          <JsonCodeEditor value={body.json} onChange={onJsonChange} t={t} error={!!jsonError} />
        </div>
      )}

      {body.type === 'text' && (
        <textarea
          className="textarea body-text"
          value={body.text}
          spellCheck={false}
          onChange={(e) => set({ text: e.target.value })}
          aria-label={t('bodyText')}
          rows={8}
        />
      )}

      {body.type === 'form' && (
        <KvEditor
          rows={body.form}
          onChange={(rows) => set({ form: rows })}
          keyPlaceholder={t('key')}
          valuePlaceholder={t('value')}
          t={t}
        />
      )}

      {body.type === 'urlencoded' && (
        <KvEditor
          rows={body.urlencoded}
          onChange={(rows) => set({ urlencoded: rows })}
          keyPlaceholder={t('key')}
          valuePlaceholder={t('value')}
          t={t}
        />
      )}

      {body.type === 'none' && <p className="editor-hint">{t('noBody')}</p>}
    </div>
  );
}

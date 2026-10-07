import React from 'react';

let n = 0;
export function newKvRow(key = '', value = '') {
  n += 1;
  return { id: `kv${Date.now()}_${n}`, enabled: true, key, value };
}

/** Generic enabled key/value row editor used by params, headers and form bodies. */
export default function KvEditor({ rows, onChange, keyPlaceholder, valuePlaceholder, t, datalistId, datalistOptions }) {
  const update = (id, patch) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id) => onChange(rows.filter((r) => r.id !== id));
  const add = () => onChange([...rows, newKvRow()]);

  return (
    <div className="kv-editor">
      {datalistOptions && (
        <datalist id={datalistId}>
          {datalistOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
      <div className="kv-head">
        <span className="kv-col-check" title={t('enabled')} aria-hidden="true" />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      {rows.map((r) => (
        <div className={`kv-row ${r.enabled ? '' : 'kv-disabled'}`} key={r.id}>
          <input
            type="checkbox"
            className="kv-check"
            checked={r.enabled}
            onChange={(e) => update(r.id, { enabled: e.target.checked })}
            aria-label={t('enabled')}
          />
          <input
            className="input kv-key"
            value={r.key}
            spellCheck={false}
            autoComplete="off"
            placeholder={keyPlaceholder}
            list={datalistId}
            onChange={(e) => update(r.id, { key: e.target.value })}
            aria-label={keyPlaceholder}
          />
          <input
            className="input kv-value"
            value={r.value}
            spellCheck={false}
            autoComplete="off"
            placeholder={valuePlaceholder}
            onChange={(e) => update(r.id, { value: e.target.value })}
            aria-label={valuePlaceholder}
          />
          <button
            type="button"
            className="icon-btn icon-btn-sm"
            onClick={() => remove(r.id)}
            aria-label={t('removeRow')}
            title={t('removeRow')}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm kv-add" onClick={add}>
        + {t('addRow')}
      </button>
    </div>
  );
}

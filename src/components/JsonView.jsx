import React, { useEffect, useMemo, useState } from 'react';

const COLLAPSE_CHILDREN_OVER = 40;
const COLLAPSE_DEPTH_AT = 3;

function containsMatch(value, name, term) {
  if (name && name.toLowerCase().includes(term)) return true;
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.entries(value).some(([k, v]) => containsMatch(v, k, term));
  }
  return String(value).toLowerCase().includes(term);
}

/** Wrap case-insensitive matches of term in <mark>. */
function hi(text, term) {
  const s = String(text);
  if (!term) return s;
  const lower = s.toLowerCase();
  const out = [];
  let i = 0;
  let k = 0;
  while (true) {
    const idx = lower.indexOf(term, i);
    if (idx === -1) break;
    if (idx > i) out.push(s.slice(i, idx));
    out.push(
      <mark key={k++} className="jv-mark">
        {s.slice(idx, idx + term.length)}
      </mark>
    );
    i = idx + term.length;
  }
  out.push(s.slice(i));
  return out.length > 1 ? out : s;
}

function Primitive({ value, term }) {
  if (value === null) return <span className="tok-null">null</span>;
  if (typeof value === 'string')
    return (
      <span className="tok-str">
        &quot;{hi(value, term)}&quot;
      </span>
    );
  if (typeof value === 'number') return <span className="tok-num">{String(value)}</span>;
  if (typeof value === 'boolean') return <span className="tok-bool">{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function Node({ name, value, depth, term, treeCmd, isRoot }) {
  const isObj = value !== null && typeof value === 'object';
  const entries = useMemo(() => (isObj ? Object.entries(value) : []), [value, isObj]);
  const isArr = Array.isArray(value);
  const [collapsed, setCollapsed] = useState(
    () => isObj && (depth >= COLLAPSE_DEPTH_AT || entries.length > COLLAPSE_CHILDREN_OVER)
  );

  useEffect(() => {
    if (treeCmd) setCollapsed(treeCmd.mode === 'collapse' && isObj);
  }, [treeCmd, isObj]);

  useEffect(() => {
    if (term && isObj && containsMatch(value, name, term)) setCollapsed(false);
  }, [term, value, name, isObj]);

  if (!isObj) {
    return (
      <div className="jv-line">
        {!isRoot && (
          <span className="jv-key">
            {hi(name, term)}
            <span className="jv-colon">: </span>
          </span>
        )}
        <Primitive value={value} term={term} />
      </div>
    );
  }

  const open = isArr ? '[' : '{';
  const close = isArr ? ']' : '}';
  const countLabel = isArr
    ? `${entries.length} item${entries.length === 1 ? '' : 's'}`
    : `${entries.length} key${entries.length === 1 ? '' : 's'}`;

  return (
    <div className="jv-node">
      <div className="jv-line">
        <button
          type="button"
          className="jv-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={collapsed ? 'jv-caret-closed' : ''}
            aria-hidden="true"
          >
            <path d="M3 1.5l4 3.5-4 3.5z" fill="currentColor" />
          </svg>
        </button>
        {!isRoot && (
          <span className="jv-key">
            {hi(name, term)}
            <span className="jv-colon">: </span>
          </span>
        )}
        <button type="button" className="jv-brace" onClick={() => setCollapsed((c) => !c)}>
          {open}
          {collapsed && (
            <span className="jv-count">
              {close} <span className="jv-count-badge">{countLabel}</span>
            </span>
          )}
        </button>
      </div>
      {!collapsed && (
        <div className="jv-children">
          {entries.map(([k, v]) => (
            <Node
              key={isArr ? k : `${k}`}
              name={isArr ? k : k}
              value={v}
              depth={depth + 1}
              term={term}
              treeCmd={treeCmd}
            />
          ))}
          <div className="jv-line jv-close">{close}</div>
        </div>
      )}
    </div>
  );
}

/** Collapsible, searchable JSON tree. Large subtrees start collapsed. */
export default function JsonView({ data, search, treeCmd }) {
  const term = (search || '').trim().toLowerCase();
  return (
    <div className="jv-tree" role="tree" aria-label="JSON response">
      <Node name="" value={data} depth={0} term={term} treeCmd={treeCmd} isRoot />
    </div>
  );
}

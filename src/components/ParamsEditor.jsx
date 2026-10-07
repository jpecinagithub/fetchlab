import React from 'react';
import KvEditor from './KvEditor.jsx';

export default function ParamsEditor({ rows, onChange, t }) {
  return (
    <div>
      <p className="editor-hint">{t('paramsHint')}</p>
      <KvEditor
        rows={rows}
        onChange={onChange}
        keyPlaceholder={t('key')}
        valuePlaceholder={t('value')}
        t={t}
      />
    </div>
  );
}

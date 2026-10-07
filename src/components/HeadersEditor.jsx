import React from 'react';
import KvEditor from './KvEditor.jsx';

const COMMON_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'User-Agent',
  'Cache-Control',
  'X-API-Key',
  'X-Requested-With',
  'Accept-Language',
  'Accept-Encoding',
  'Origin',
  'Referer',
  'If-None-Match',
  'If-Modified-Since',
];

export default function HeadersEditor({ rows, onChange, t }) {
  return (
    <div>
      <p className="editor-hint">{t('headersHint')}</p>
      <KvEditor
        rows={rows}
        onChange={onChange}
        keyPlaceholder={t('key')}
        valuePlaceholder={t('value')}
        t={t}
        datalistId="common-headers"
        datalistOptions={COMMON_HEADERS}
      />
    </div>
  );
}

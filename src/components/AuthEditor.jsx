import React from 'react';

const TYPES = ['none', 'bearer', 'basic', 'apikey'];

export default function AuthEditor({ auth, onChange, t }) {
  const set = (patch) => onChange({ ...auth, ...patch });

  return (
    <div className="auth-editor">
      <label className="field-label" htmlFor="auth-type">
        {t('authType')}
      </label>
      <select
        id="auth-type"
        className="select auth-select"
        value={auth.type}
        onChange={(e) => set({ type: e.target.value })}
      >
        {TYPES.map((ty) => (
          <option key={ty} value={ty}>
            {t(
              ty === 'none'
                ? 'authNone'
                : ty === 'bearer'
                ? 'authBearer'
                : ty === 'basic'
                ? 'authBasic'
                : 'authApiKey'
            )}
          </option>
        ))}
      </select>

      {auth.type === 'bearer' && (
        <div className="auth-fields">
          <label className="field-label" htmlFor="bearer-token">
            {t('bearerToken')}
          </label>
          <input
            id="bearer-token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className="input"
            value={auth.bearer || ''}
            onChange={(e) => set({ bearer: e.target.value })}
            placeholder="eyJhbGciOi…"
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="auth-fields auth-grid">
          <div>
            <label className="field-label" htmlFor="basic-user">
              {t('username')}
            </label>
            <input
              id="basic-user"
              className="input"
              autoComplete="off"
              spellCheck={false}
              value={auth.basicUser || ''}
              onChange={(e) => set({ basicUser: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="basic-pass">
              {t('password')}
            </label>
            <input
              id="basic-pass"
              type="password"
              className="input"
              autoComplete="off"
              value={auth.basicPass || ''}
              onChange={(e) => set({ basicPass: e.target.value })}
            />
          </div>
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className="auth-fields">
          <div className="auth-grid">
            <div>
              <label className="field-label" htmlFor="apikey-name">
                {t('apiKeyName')}
              </label>
              <input
                id="apikey-name"
                className="input"
                autoComplete="off"
                spellCheck={false}
                value={auth.apiKeyName || 'X-API-Key'}
                onChange={(e) => set({ apiKeyName: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="apikey-in">
                {t('apiKeyIn')}
              </label>
              <select
                id="apikey-in"
                className="select"
                value={auth.apiKeyIn || 'header'}
                onChange={(e) => set({ apiKeyIn: e.target.value })}
              >
                <option value="header">{t('apiKeyInHeader')}</option>
                <option value="query">{t('apiKeyInQuery')}</option>
              </select>
            </div>
          </div>
          <label className="field-label" htmlFor="apikey-value">
            {t('apiKeyValue')}
          </label>
          <input
            id="apikey-value"
            type="password"
            className="input"
            autoComplete="off"
            spellCheck={false}
            value={auth.apiKey || ''}
            onChange={(e) => set({ apiKey: e.target.value })}
          />
        </div>
      )}

      {auth.type !== 'none' && <p className="editor-hint auth-hint">{t('authHint')}</p>}
    </div>
  );
}

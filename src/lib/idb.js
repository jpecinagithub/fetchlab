// Minimal IndexedDB wrapper for the request history store.

const DB_NAME = 'fetchlab';
const STORE = 'api-history';
const EXAMPLES_STORE = 'custom-examples';
const MAX_RECORDS = 50;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('ts', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(EXAMPLES_STORE)) {
        db.createObjectStore(EXAMPLES_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function historyAdd(entry) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const r = tx(db, 'readwrite').put(entry);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  // Enforce the 50-record cap: delete oldest beyond the limit.
  const keys = await new Promise((resolve, reject) => {
    const out = [];
    const cursor = tx(db, 'readonly').index('ts').openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        out.push(c.primaryKey);
        c.continue();
      } else resolve(out);
    };
    cursor.onerror = () => reject(cursor.error);
  });
  if (keys.length > MAX_RECORDS) {
    const overflow = keys.slice(0, keys.length - MAX_RECORDS);
    await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const store = t.objectStore(STORE);
      overflow.forEach((k) => store.delete(k));
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  }
  db.close();
}

export async function historyList() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const r = tx(db, 'readonly').getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return rows.sort((a, b) => b.timestamp - a.timestamp);
}

export async function historyDelete(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const r = tx(db, 'readwrite').delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

export async function historyClear() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const r = tx(db, 'readwrite').clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

export const HISTORY_LIMIT = MAX_RECORDS;

/* ---------- User-saved examples (named, kept until deleted) ---------- */

export async function examplesAdd(entry) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const r = db.transaction(EXAMPLES_STORE, 'readwrite').objectStore(EXAMPLES_STORE).put(entry);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

export async function examplesList() {
  const db = await openDb();
  const rows = await new Promise((resolve, reject) => {
    const r = db.transaction(EXAMPLES_STORE, 'readonly').objectStore(EXAMPLES_STORE).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return rows.sort((a, b) => b.timestamp - a.timestamp);
}

export async function examplesDelete(id) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const r = db.transaction(EXAMPLES_STORE, 'readwrite').objectStore(EXAMPLES_STORE).delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

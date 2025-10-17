// IndexedDB helper for cases and research
const DB_NAME = 'student-progress-db';
const CASES_STORE = 'offline-cases';
const RESEARCH_STORE = 'offline-research';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CASES_STORE)) {
        db.createObjectStore(CASES_STORE, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(RESEARCH_STORE)) {
        db.createObjectStore(RESEARCH_STORE, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Cases
export async function saveCaseOffline(obj) {
  const db = await openDB();
  const tx = db.transaction(CASES_STORE, 'readwrite');
  tx.objectStore(CASES_STORE).add(obj);
  return tx.complete;
}

export async function getAllOfflineCases() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(CASES_STORE, 'readonly');
    const req = tx.objectStore(CASES_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

export async function clearOfflineCases() {
  const db = await openDB();
  const tx = db.transaction(CASES_STORE, 'readwrite');
  tx.objectStore(CASES_STORE).clear();
  return tx.complete;
}

// Research
export async function saveResearchOffline(obj) {
  const db = await openDB();
  const tx = db.transaction(RESEARCH_STORE, 'readwrite');
  tx.objectStore(RESEARCH_STORE).add(obj);
  return tx.complete;
}

export async function getAllOfflineResearch() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(RESEARCH_STORE, 'readonly');
    const req = tx.objectStore(RESEARCH_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

export async function clearOfflineResearch() {
  const db = await openDB();
  const tx = db.transaction(RESEARCH_STORE, 'readwrite');
  tx.objectStore(RESEARCH_STORE).clear();
  return tx.complete;
}

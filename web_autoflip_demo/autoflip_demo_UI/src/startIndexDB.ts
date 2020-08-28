// Open and sets the indexedDB properties.
let db: IDBDatabase;
let request = indexedDB.open('auto-flip', 1);
request.onerror = (event: Event): void => {
  console.error('MAIN: Failed to load indexeddb');
  throw new Error(String(event));
};
request.onsuccess = (event: Event): void => {
  db = (event.target as IDBOpenDBRequest).result;
  console.log(`MAIN: success`);
  const transaction = db.transaction(['decodedFrames'], 'readwrite');
  const objectStore = transaction.objectStore('decodedFrames');
  objectStore.clear();
  console.log(`MAIN: database clear!`);
};
request.onupgradeneeded = function (event: Event): void {
  const db = (event.target as IDBOpenDBRequest).result;
  console.log(`MAIN: upgrade`);
  if (!db.objectStoreNames.contains('decodedFrames')) {
    console.log(`MAIN: database created!`);
    db.createObjectStore('decodedFrames', { keyPath: 'frameId' });
  }
};

/**
 * Copyright 2020 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Open and sets the indexedDB properties.
let db: IDBDatabase;
let request = indexedDB.open('auto-flip', 1);
request.onerror = (event: Event): void => {
  console.error('MAIN: Failed to load indexeddb');
  throw new Error(String(event));
};
request.onsuccess = (event: Event): void => {
  db = (event.target as IDBOpenDBRequest).result;
  const transaction = db.transaction(['decodedFrames'], 'readwrite');
  const objectStore = transaction.objectStore('decodedFrames');
  objectStore.clear();
  console.log(`MAIN: indexeddb database clear!`);
};
request.onupgradeneeded = function (event: Event): void {
  const db = (event.target as IDBOpenDBRequest).result;
  if (!db.objectStoreNames.contains('decodedFrames')) {
    console.log(`MAIN: indexeddb database created!`);
    db.createObjectStore('decodedFrames', { keyPath: 'frameId' });
  }
};

/**
Copyright 2020 Google LLC
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/** Gets initalized indexDB database. */
async function getIndexDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let db: IDBDatabase;
    const request = indexedDB.open('auto-flip', 1);
    request.onerror = (event: Event) => {
      console.error('FFMPEG: Failed to load indexeddb');
      throw new Error(String(event));
    };
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
  });
}

/** Adds section frames to indexDB "frames" store. */
export function addSectionFramestoIndexDB(
  framesData: Frame[],
  videoId: number,
  workerId: number,
  user: { inputWidth: number; inputHeight: number },
): void {
  //const ctx = self as any;
  // Gets the indexDB database to store the decoded frame data.
  getIndexDB().then((db: IDBDatabase) => {
    // Inizializes a transation on database 'decodeFrames'.
    let transaction: IDBTransaction = db.transaction(
      ['decodedFrames'],
      'readwrite',
    );
    transaction.oncomplete = function (): void {
      console.log(
        `FFMEPG: Transaction is complete for section ${videoId} from worker ${workerId}`,
      );
      ctx.postMessage({
        type: 'decodingDone',
        videoId: videoId,
        workerId: workerId,
        user: user,
      });
    };
    transaction.onerror = function (): void {
      console.log(`FFMPEG: Transaction failed for section ${videoId}`);
    };

    // Gets an object store to operate on it.
    const decodedFrames: IDBObjectStore = transaction.objectStore(
      'decodedFrames',
    );
    // Stores each decode frame data tp indexDB.
    for (let i = 0; i < framesData.length; i++) {
      let request: IDBRequest<IDBValidKey> = decodedFrames.add(framesData[i]);
      request.onsuccess = function (): void {};
      request.onerror = function (): void {
        console.log(`Error frame ${framesData[i].frameId}`, request.error);
      };
    }
  });
}

/** Reads frame decode data rows from the indexDB. */
export async function readFramesFromIndexedDB(
  videoId: number,
  startId: number,
  frameNumber: number,
): Promise<Frame[]> {
  console.log(`startid`, startId);
  const key = startId;
  console.log(`frameNumber last`, frameNumber);
  console.log(`key, read from database`, key, frameNumber);
  // Gets the indexDB database to fetch the decoded frame data
  return new Promise((resolve, reject) => {
    getIndexDB().then((db: IDBDatabase) => {
      const transaction: IDBTransaction = db.transaction(['decodedFrames']);
      const objectStore: IDBObjectStore = transaction.objectStore(
        'decodedFrames',
      );
      let frameData: Frame[] = [];
      transaction.oncomplete = function (): void {
        console.log(
          `AUTOFLIP: IndexDB: Transaction get is complete for section ${videoId}`,
        );
        resolve(frameData);
      };
      transaction.onerror = function (): void {
        reject(`Transaction get failed for section ${videoId}`);
      };
      for (let i = 0; i < frameNumber; i++) {
        let request = objectStore.get(key + i);
        request.onerror = function (event) {
          console.log(
            'AUTOFLIP: IndexDB: Unable to retrieve data from database!',
          );
        };
        request.onsuccess = function (event: Event): void {
          // Do something with the request.result!
          if (request.result) {
            frameData.push(request.result);
          } else {
            console.log(
              `IndexDB:frame(${key + i}) couldn't be found in your database!`,
            );
          }
        };
      }
    });
  });
}

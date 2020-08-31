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

/** FFmpeg wasm binary resulting data. */

importScripts('./ffmpeg_wasm/ffmpeg.js');

let videoBufferReceived: ArrayBuffer;

/** Parses a string command to arguments. */
function parseArguments(text: string): string[] {
  text = text.replace(/\s+/g, ' ');
  let args: string[] = [];
  // This allows double quotes to not split args.
  text.split('"').forEach(function (t, i): void {
    t = t.trim();
    if (i % 2 === 1) {
      args.push(t);
    } else {
      args = args.concat(t.split(' '));
    }
  });
  return args;
}

/** Sends output data back to main script. */
onmessage = function (e: MessageEvent): void {
  if (e.data.type === 'videoData') {
    videoBufferReceived = e.data.video;
    console.log(
      `ffmpeg ${e.data.workerId} recieved the video Info`,
      videoBufferReceived,
    );
  } else {
    const ctx = self as any;
    console.log(
      `FFMPEG: ffmpeg Worker ${e.data.workerId}: video array received from main`,
    );
    console.log(
      `FFMPEG: going to process video array(${e.data.videoId})`,
      e.data,
    );
    const ffmpegWasmWorker = new ctx.Module.ffmpegWasmClass();
    const args = parseArguments(
      `-ss ${e.data.startTime} -i input.webm -t ${e.data.workWindow} -vf fps=15 -c:v rawvideo -pixel_format yuv420p out_%04d.tif`,
    );
    ffmpegWasmWorker
      .callMain({
        files: [
          {
            name: 'input.webm',
            data: new Uint8Array(videoBufferReceived),
            type: 'default_file_type',
          },
        ],
        arguments: args || [],
        returnFfmpegLogOutput: true,
        recreateFFmpegWasmInstance: true,
      })
      .then(function (result: FFmpegResult): void {
        console.log(
          `FFMPEG: get result frames from section ${e.data.videoId} by worker ${e.data.workerId}`,
          result,
        );
        const frames: Frame[] = result.buffers;
        const startTime: number = e.data.startTime;
        const frameIdStart: number = startTime * 15;
        for (let i = 0; i < frames.length; i++) {
          frames[i]['frameId'] = i + frameIdStart;
        }
        addSectionFramestoIndexDB(
          frames,
          e.data.videoId,
          e.data.workerId,
          e.data.user,
        );
      });
  }
};

/** Adds section frames to indexDB "frames" store. */
function addSectionFramestoIndexDB(
  framesData: Frame[],
  videoId: number,
  workerId: number,
  user: { inputWidth: number; inputHeight: number },
): void {
  const ctx = self as any;
  // Gets the indexDB database to store the decoded frame data.
  getIndexDBToWrite().then((db: IDBDatabase) => {
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

/** Gets initalized indexDB database. */
async function getIndexDBToWrite(): Promise<IDBDatabase> {
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

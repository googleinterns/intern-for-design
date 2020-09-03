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

importScripts('./autoflip_wasm/autoflip_live_bin.js');
importScripts('./autoflip_wasm/autoflip_live_loader.js');

const ctx = self as any;
let videoWidth: number = 0;
let videoHeight: number = 0;
let videoAspectWidth: number = 0;
let videoAspectHeight: number = 0;
let workerWindow: number = 0;
let resultCropInfo: ExternalRenderingInformation[] = [];
let resultShots: number[] = [];
let resultFaces: faceDetectRegion[][] = [];
let resultBorders: BorderRegion[][] = [];
let timestampHead: number = 0;
let frameNumber: number = workerWindow * 15;
let refeedInformation: RefeedSignals = {
  borders: [],
  detections: [],
  shots: [],
};
let hasSignals: boolean = false;

let autoflipModule: any;
declare const Module: any;
Module.locateFile = (f: string): string => `autoflip_wasm/${f}`;
const demo = ctx.DemoModule(Module);

function startAutoflip() {
  demo.then((module: any): void => {
    autoflipModule = module;
    const shotPacketListener: any = autoflipModule.PacketListener.implement(
      shotChange,
    );
    const extPacketListener: any = autoflipModule.PacketListener.implement(
      externalRendering,
    );
    const featurePacketListener: any = autoflipModule.PacketListener.implement(
      featureDetect,
    );
    const borderPacketListener: any = autoflipModule.PacketListener.implement(
      borderDetect,
    );

    autoflipModule.attachListener(
      'external_rendering_per_frame',
      extPacketListener,
    );
    autoflipModule.attachListener('shot_change', shotPacketListener);
    autoflipModule.attachListener('salient_regions', featurePacketListener);
    autoflipModule.attachListener('borders', borderPacketListener);

    fetch('autoflip_wasm/autoflip_web_graph.binarypb')
      .then(
        (response): Promise<ArrayBuffer> => {
          return response.arrayBuffer();
        },
      )
      .then((buffer): void => {
        autoflipModule.setAspectRatio(videoAspectWidth, videoAspectHeight);
        autoflipModule.changeBinaryGraph(buffer);
      });
  });
}

/** Analyzes the input frames and output caculated crop windows for each frame. */
onmessage = function (e: MessageEvent): void {
  let signal: Signal = e.data;
  console.log(`AUTOFLIP: video(${signal.videoId}) start to crop`, signal);

  if (signal.type === 'changeAspectRatio') {
    videoAspectWidth = signal.user.inputWidth;
    videoAspectHeight = signal.user.inputHeight;
    autoflipModule.setAspectRatio(videoAspectWidth, videoAspectHeight);
    autoflipModule.cycleGraph();
    timestampHead = Math.floor(signal.startId * (1 / 15) * 1000000);
    resultCropInfo = [];
    resultShots = [];
    resultFaces = [];
    resultBorders = [];
  }
  if (
    videoAspectWidth !== 0 &&
    (signal.user.inputWidth !== videoAspectWidth ||
      signal.user.inputHeight !== videoAspectHeight)
  ) {
    return;
  }

  if (signal.type === 'firstCrop') {
    videoWidth = signal.width;
    videoHeight = signal.height;
    workerWindow = signal.window;
    videoAspectWidth =
      signal.user.inputWidth === 0 ? 1 : signal.user.inputWidth;
    videoAspectHeight =
      signal.user.inputHeight === 0 ? 1 : signal.user.inputHeight;
    frameNumber = workerWindow * 15;
    console.log(
      `user input Autoflip`,
      signal.user.inputWidth,
      signal.user.inputHeight,
    );
    if (autoflipModule === undefined) {
      startAutoflip();
    }
  }

  if (signal.type === 'changeAspectRatio') {
    frameNumber = (1 + signal.videoId) * 15 * workerWindow - signal.startId;
  } else {
    frameNumber = workerWindow * 15;
  }

  if (hasSignals) {
    refeedSignals();
    const b = autoflipModule.closeGraphInternal();
    // This posts the analysis result back to main script.
    ctx.postMessage({
      type: 'finishedAnalysis',
      cropWindows: resultCropInfo,
      startId: signal.startId,
      videoId: signal.videoId,
      shots: resultShots,
      faceDetections: resultFaces,
      borders: resultBorders,
      user: signal.user,
    });
    resultCropInfo = [];
    resultShots = [];
    resultFaces = [];
    resultBorders = [];
  } else {
    // Gets frameData from indexDB and process with Autoflip.
    readFramesFromIndexedDB(signal.videoId, signal.startId, frameNumber).then(
      (value: Frame[]): void => {
        console.log(`PROMISE: promise ${signal.videoId} returned`);
        let frameData: Frame[] = value;
        handleFrames(frameData, signal);
        if (signal.end === true) {
          const b = autoflipModule.closeGraphInternal();
          // This posts the analysis result back to main script.
          ctx.postMessage({
            type: 'finishedAnalysis',
            cropWindows: resultCropInfo,
            startId: signal.startId,
            videoId: signal.videoId,
            shots: resultShots,
            faceDetections: resultFaces,
            borders: resultBorders,
            user: signal.user,
          });

          console.log('refeed', refeedInformation);
          hasSignals = true;
        } else {
          autoflipModule.runTillIdle();
          // This posts the current analysis result back to main script.
          ctx.postMessage({
            type: 'currentAnalysis',
            cropWindows: resultCropInfo,
            startId: signal.startId,
            videoId: signal.videoId,
            shots: resultShots,
            faceDetections: resultFaces,
            borders: resultBorders,
            user: signal.user,
          });
        }
        resultCropInfo = [];
        resultShots = [];
        resultFaces = [];
        resultBorders = [];
      },
    );
  }
};

// These are the listeners that will recieve the changes from autoflip.
// They are called whenever there is a change.

let shotChange = {
  onShot: (stream: string, change: boolean, timestampMs: number) => {
    const timestampForVideo = timestampMs + timestampHead;
    resultShots.push(timestampForVideo);
    console.log(`detect shot!`, timestampForVideo, timestampMs, timestampHead);
    if (!hasSignals) {
      refeedInformation.shots.push({
        shot: change,
        timestamp: timestampMs,
      });
    }
  },
};
let externalRendering = {
  onExternalRendering: (stream: string, proto: string) => {
    let cropInfo = convertSeralizedExternalRenderingInfoToObj(proto);
    resultCropInfo.push(cropInfo);
    console.log(`detect crop window!`, cropInfo);
  },
};
let featureDetect = {
  onFeature: (stream: string, proto: string, timestamp: number) => {
    let faceInfo: faceDetectRegion[] = convertSeralizedFaceDetectionInfoToObj(
      proto,
      timestamp,
    );
    resultFaces.push(faceInfo);
    console.log(`detect feature window!`, faceInfo, timestamp);
    if (!hasSignals) {
      refeedInformation.detections.push({
        detection: proto,
        timestamp: timestamp,
      });
    }
  },
};
let borderDetect = {
  onBorder: (stream: string, proto: string, timestamp: number) => {
    let borderInfo: BorderRegion[] = convertSeralizedBorderInfoToObj(
      proto,
      timestamp,
    );
    resultBorders.push(borderInfo);
    console.log(`detect border!`, proto, timestamp);
    if (!hasSignals) {
      refeedInformation.borders.push({
        border: proto,
        timestamp: timestamp,
      });
    }
  },
};

/** Transfers the crop windows rectangles from stream. */
function convertSeralizedRectToObj(protoArray: number[]): Rect | undefined {
  if (protoArray.length !== 4) {
    return undefined;
  }
  return {
    x: protoArray[0] ?? 0,
    y: protoArray[1] ?? 0,
    width: protoArray[2] ?? 0,
    height: protoArray[3] ?? 0,
  };
}

/** Transfers the background color rectangles from stream. */
function convertSeralizedColorToObj(protoArray: number[]): Color | undefined {
  if (protoArray.length !== 3) {
    return undefined;
  }
  return {
    r: protoArray[0] ?? 0,
    g: protoArray[1] ?? 0,
    b: protoArray[2] ?? 0,
  };
}

/** Transfers the overall crop and render information from stream. */
function convertSeralizedExternalRenderingInfoToObj(
  protoString: string,
): ExternalRenderingInformation {
  const protoArray: any[] = JSON.parse(protoString);
  const renderInformation: Partial<ExternalRenderingInformation> = {};
  if (protoArray[0] ?? false) {
    renderInformation.cropFromLocation = convertSeralizedRectToObj(
      protoArray[0] as any[],
    );
  }
  if (protoArray[1] ?? false) {
    renderInformation.renderToLocation = convertSeralizedRectToObj(
      protoArray[1] as any[],
    );
  }
  if (protoArray[2] ?? false) {
    renderInformation.padding_color = convertSeralizedColorToObj(
      protoArray[2] as any[],
    );
  }
  renderInformation.timestampUS = (protoArray[3] ?? 0) + timestampHead;
  if (protoArray[4] ?? false) {
    renderInformation.targetWidth = protoArray[4];
  }
  if (protoArray[5] ?? false) {
    renderInformation.targetHeight = protoArray[5];
  }
  return renderInformation;
}

/** Transfers the overall crop and render information from stream. */
function convertSeralizedFaceDetectionInfoToObj(
  protoString: string,
  timestamp: number,
): faceDetectRegion[] {
  const protoArray: any[] = JSON.parse(protoString);
  let faceDetectionsInfo: faceDetectRegion[] = [];

  if (protoArray.length === 0) {
    const faceDetect: faceDetectRegion = {};
    faceDetect.timestamp = timestamp + timestampHead;
    faceDetectionsInfo.push(faceDetect);
  }
  if (protoArray[1] ?? false) {
    for (let i = 0; i < protoArray[1].length; i++) {
      const faceDetect: faceDetectRegion = {};
      if (protoArray[1][i][1] ?? false) {
        faceDetect.score = protoArray[1][i][1];
      }
      if (protoArray[1][i][5] ?? false) {
        faceDetect.signalType = protoArray[1][i][5][0];
      }
      if (protoArray[1][i][7] ?? false) {
        faceDetect.faceRegion = convertSeralizedRectToObj(
          protoArray[1][i][7] as any[],
        );
      }
      faceDetect.timestamp = timestamp + timestampHead;
      console.log('face', faceDetect);
      faceDetectionsInfo.push(faceDetect);
    }
  }
  return faceDetectionsInfo;
}

/** Transfers the border information from stream. */
function convertSeralizedBorderInfoToObj(
  protoString: string,
  timestamp: number,
): BorderRegion[] {
  const protoArray: any[] = JSON.parse(protoString);
  let borderInfo: BorderRegion[] = [];
  if (protoArray[0] === null) {
    const borderDetect: BorderRegion = {};
    borderDetect.timestamp = timestamp + timestampHead;
    borderInfo.push(borderDetect);
    return borderInfo;
  }
  for (let i = 0; i < protoArray[0].length; i++) {
    const borderDetect: BorderRegion = {};
    borderDetect.border = convertSeralizedRectToObj(
      protoArray[0][i][0],
    ) as Rect;
    borderDetect.timestamp = timestamp + timestampHead;
    borderInfo.push(borderDetect);
  }
  return borderInfo;
}

/** Processes input frames with autoflip wasm. */
async function refeedSignals(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('AUTOFLIP: start refeeding');
    const info = { width: videoWidth, height: videoHeight };
    let featureIndex = 0;
    let shotIndex = 0;
    console.log('size', refeedInformation.borders.length);
    for (let i = 0; i < refeedInformation.borders.length; i++) {
      console.log(`feed ${i}`);
      const curTimestamp = refeedInformation.borders[i].timestamp;
      autoflipModule.processSize(info.width, info.height);
      autoflipModule.processBorders(refeedInformation.borders[i].border);
      if (
        featureIndex < refeedInformation.detections.length &&
        curTimestamp === refeedInformation.detections[featureIndex].timestamp
      ) {
        autoflipModule.processSalientRegions(
          refeedInformation.detections[featureIndex].detection,
        );
        featureIndex++;
      }
      if (
        shotIndex < refeedInformation.shots.length &&
        curTimestamp === refeedInformation.shots[shotIndex].timestamp
      ) {
        console.log('match the timestamp for shot');
        autoflipModule.processShots(refeedInformation.shots[shotIndex].shot);
        shotIndex++;
      }
      autoflipModule.processTimeStamp();
    }
    resolve('success');
  });
}

/** Processes input frames with autoflip wasm. */
async function handleFrames(
  frameData: Frame[],
  signal: Signal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(
      `AUTOFLIP: video (${signal.videoId}) received from main`,
      frameData,
    );
    const info = { width: videoWidth, height: videoHeight };
    for (let i = 0; i < frameData.length; i++) {
      const image = frameData[i].data; // Array buffer from FFmpeg, .tiff <-
      // Saving array buffer to the wasm heap memory.
      const numBytes = image.byteLength;
      const ptr = ctx.Module._malloc(numBytes);
      const heapBytes = new Uint8Array(ctx.Module.HEAPU8.buffer, ptr, numBytes);
      const uint8Image = new Uint8Array(image);
      heapBytes.set(uint8Image);
      // End saving memory.
      const status = autoflipModule.processRawYuvBytes(
        ptr,
        info.width,
        info.height,
      );

      // Do this to check if it saved correctly.
      if (!status) {
        console.error(status);
        throw new Error('Autoflip had an error!');
      }
      // Finish.
      autoflipModule._free(ptr);
    }
    resolve('success');
  });
}

/** Reads frame decode data rows from the indexDB. */
async function readFramesFromIndexedDB(
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
    getIndexDBToRead().then((db: IDBDatabase) => {
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

/** Gets initalized indexDB database. */
async function getIndexDBToRead(): Promise<IDBDatabase> {
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

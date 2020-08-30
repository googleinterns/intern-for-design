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

// These are the listeners that will recieve the changes from autoflip.
// They are called whenever there is a change.
import {
  timestampHead,
  resultShots,
  hasSignals,
  refeedInformation,
  resultCropInfo,
  resultFaces,
  videoWidth,
  videoHeight,
  autoflipModule,
  ctx,
} from './autoflip_worker';
import {
  faceDetectRegion,
  ExternalRenderingInformation,
  Frame,
  Signal,
  Color,
  Rect,
} from './interfaces';
export let shotChange = {
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
export let externalRendering = {
  onExternalRendering: (stream: string, proto: string) => {
    let cropInfo = convertSeralizedExternalRenderingInfoToObj(proto);
    resultCropInfo.push(cropInfo);
    console.log(`detect crop window!`, cropInfo);
  },
};
export let featureDetect = {
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
export let borderDetect = {
  onBorder: (stream: string, proto: string, timestamp: number) => {
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
  renderInformation.timestampUS = protoArray[3] ?? 0;
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
  console.log('proto', protoString);
  const protoArray: any[] = JSON.parse(protoString);
  let faceDetectionsInfo: faceDetectRegion[] = [];

  if (protoArray.length === 0) {
    const faceDetect: faceDetectRegion = {};
    faceDetect.timestamp = timestamp;
    faceDetectionsInfo.push(faceDetect);
  }
  if (protoArray[1] ?? false) {
    console.log('the second half of the array', protoArray[1]);
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
      faceDetect.timestamp = timestamp;
      console.log('face', faceDetect);
      faceDetectionsInfo.push(faceDetect);
    }
  }
  return faceDetectionsInfo;
}

/** Processes input frames with autoflip wasm. */
export async function refeedSignals(): Promise<string> {
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
      //autoflipModule.processSalientRegions('[]');
      //autoflipModule.processShots(true);
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
export async function handleFrames(
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

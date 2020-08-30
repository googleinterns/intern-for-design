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

importScripts('autoflip_wasm/autoflip_live_bin.js');
importScripts('autoflip_wasm/autoflip_live_loader.js');
importScripts('utils_indexDB.js');
importScripts('utils_autoflip.js');
import { handleFrames, refeedSignals } from './utils_autoflip';
import {
  ExternalRenderingInformation,
  faceDetectRegion,
  RefeedSignals,
  Signal,
  Frame,
} from './interfaces';

import {
  shotChange,
  externalRendering,
  borderDetect,
  featureDetect,
} from './utils_autoflip';

export const ctx: any = self;
export let videoWidth: number = 0;
export let videoHeight: number = 0;
let videoAspectWidth: number = 1;
let videoAspectHeight: number = 1;
let workerWindow: number = 0;
export let resultCropInfo: ExternalRenderingInformation[] = [];
export let resultShots: number[] = [];
export let resultFaces: faceDetectRegion[][] = [];
export let timestampHead: number = 0;
let frameNumber: number = workerWindow * 15;
export let refeedInformation: RefeedSignals = {
  borders: [],
  detections: [],
  shots: [],
};
export let hasSignals: boolean = false;

export let autoflipModule: any;
declare const Module: any;
Module.locateFile = (f: string): string => `autoflip_wasm/${f}`;
const demo = (this as any).DemoModule(Module);

/** Analyzes the input frames and output caculated crop windows for each frame. */
onmessage = function (e: MessageEvent): void {
  let signal: Signal = e.data;
  console.log(`AUTOFLIP: video(${signal.videoId}) start to crop`, signal);

  if (signal.type === 'changeAspectRatio') {
    videoAspectWidth = signal.user.inputWidth;
    videoAspectHeight = signal.user.inputHeight;
    console.log('restart autoflip');
    autoflipModule.setAspectRatio(videoAspectWidth, videoAspectHeight);
    autoflipModule.cycleGraph();
    timestampHead = Math.floor(signal.startId * (1 / 15) * 1000000);
  }

  if (
    signal.user.inputWidth !== videoAspectWidth ||
    signal.user.inputHeight !== videoAspectHeight
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
      user: signal.user,
    });
    resultCropInfo = [];
    resultShots = [];
    resultFaces = [];
  } else {
    // Gets frameData from indexDB and process with Autoflip.
    ctx
      .readFramesFromIndexedDB(signal.videoId, signal.startId, frameNumber)
      .then((value: Frame[]): void => {
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
            user: signal.user,
          });
        }
        resultCropInfo = [];
        resultShots = [];
        resultFaces = [];
      });
  }
};

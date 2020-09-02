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

import {
  curAspectRatio,
  numberOfSection,
  finished,
  processWindow,
  videoInfo,
  sectionIndexStorage,
  autoflipIsFree,
  updateAutoflipIsFree,
  countFFmpeg,
  updateCountFFmpeg,
} from './globals';

import { ffmpegWorkers, autoflipWorker } from './globals_worker';
import { createDownload } from './download';

import {
  updateFFmpegBar,
  renderCroppedInfomation,
  renderShots,
} from './utilsCrop';

import { convertDoubleToString } from './inputHandle';

/** Starts workers to process ffmpeg and autoflip */
export function startWorker(): void {
  console.log(`MAIN: workers started!`);
  for (let i = 0; i < ffmpegWorkers.length; i++) {
    console.log(`MAIN: PROCESS: send the video (${i}) to worker ${i}`);
    ffmpegWorkers[i].postMessage({
      videoId: i,
      workerId: i,
      startTime: i * processWindow,
      startId: i * 30,
      workWindow: processWindow,
      user: curAspectRatio,
    });

    ffmpegWorkers[i].onmessage = function (e: MessageEvent): void {
      finished[e.data.videoId] = true;
      updateCountFFmpeg(countFFmpeg + 1);
      updateFFmpegBar(countFFmpeg);

      if (JSON.stringify(e.data.user) === JSON.stringify(curAspectRatio)) {
        console.log(`the video(${e.data.videoId}) is continue!`);
        if (e.data.videoId === 0) {
          autoflipWorker.postMessage({
            type: 'firstCrop',
            videoId: 0,
            startTime: 0,
            startId: 0,
            width: videoInfo.width,
            height: videoInfo.height,
            window: processWindow,
            end: e.data.videoId === numberOfSection - 1,
            user: curAspectRatio,
          });
          updateAutoflipIsFree(false);
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ]++;
        }
        const expect =
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ];
        if (finished[expect] === true && autoflipIsFree === true) {
          autoflipWorker.postMessage({
            type: 'nextCropStore',
            videoId: expect,
            startTime: expect * processWindow,
            startId: expect * 30,
            width: videoInfo.width,
            height: videoInfo.height,
            end: expect === numberOfSection - 1,
            user: curAspectRatio,
          });
          updateAutoflipIsFree(false);
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ]++;
        }
      }

      if (e.data.videoId + ffmpegWorkers.length < numberOfSection) {
        let nextVideo = e.data.videoId + ffmpegWorkers.length;
        ffmpegWorkers[e.data.workerId].postMessage({
          videoId: nextVideo,
          workerId: e.data.workerId,
          startTime: nextVideo * processWindow,
          startId: nextVideo * 30,
          workWindow: processWindow,
          user: curAspectRatio,
        });
      }
    };
  }

  /** Renders video once got the result from autoflip. */
  autoflipWorker.onmessage = function (e: MessageEvent): void {
    if (JSON.stringify(e.data.user) !== JSON.stringify(curAspectRatio)) {
      return;
    }
    console.log(`MAIN: analysis received from autoflip`, e.data);
    // Applys the cropInfo to current display video.
    console.log(`MAIN: render the recevied video crop windows`);
    renderCroppedInfomation(e.data);
    console.log(`MAIN: render the recevied shots`);
    renderShots(e.data);

    if (e.data.type !== 'finishedAnalysis') {
      console.log(`request next`);
      const expect =
        sectionIndexStorage[
          `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
        ];

      console.log(`finished`, finished);
      if (finished[expect] === true) {
        autoflipWorker.postMessage({
          type: 'nextCropFind',
          videoId: expect,
          startTime: expect * processWindow,
          startId: expect * 30,
          end: expect === numberOfSection - 1,
          user: curAspectRatio,
        });
        sectionIndexStorage[
          `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
        ]++;
      } else {
        updateAutoflipIsFree(true);
      }
    } else {
      let width = convertDoubleToString(curAspectRatio.inputWidth);
      let height = convertDoubleToString(curAspectRatio.inputHeight);
      const downloadButton = <HTMLButtonElement>(
        document.getElementById(`download-${width}-${height}`)
      );

      const wrapFunctionCreateDownload = createDownload.bind(
        e,
        curAspectRatio.inputWidth,
        curAspectRatio.inputHeight,
      );
      downloadButton.onclick = wrapFunctionCreateDownload;
      downloadButton.disabled = false;
    }
  };
}

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

import { putMiddle } from './centerContent';
import { startWorker } from './startWorkers';
import { getAudioOfVideo } from './download';
import {
  videoFile,
  updateVideoFile,
  videoInfo,
  updateVideoInfo,
  videoResize,
  updateVideoResize,
  processWindow,
  numberOfSection,
  updateNumberOfSection,
  videoBuffer,
  updateVideoBuffer,
} from './globals';

import { videoPreview, videoRecord, card1, card2 } from './globals_dom';
import { ffmpegWorkers } from './globals_worker';
// Adds event to html element.
const inputVideo = <HTMLInputElement>document.querySelector('#video-upload');
inputVideo.onchange = handleOnChange;

// Centers the video element when page load.
putMiddle();

/** Handles onChange event of input video element. */
export function handleOnChange(event: Event): void {
  let promise = new Promise(function (resolve: any): void {
    if (videoFile === undefined) {
      let input = <HTMLInputElement>event.target;
      if (!input.files || !input.files[0]) return;
      updateVideoFile(input.files[0]);
    }
    console.log(`MAIN: video file has been chosen`, videoFile);

    const videoURL = URL.createObjectURL(videoFile);
    videoPreview.src = videoURL;
    videoRecord.src = videoURL;
    videoPreview.preload = 'metadata';
    videoPreview.onloadedmetadata = function (): void {
      updateVideoInfo({
        duration: videoPreview.duration,
        height: videoPreview.videoHeight,
        width: videoPreview.videoWidth,
      });
      const ratio = videoPreview.width / videoPreview.videoWidth;
      videoPreview.height = ratio * videoPreview.videoHeight;
      updateVideoResize({
        width: videoPreview.width,
        height: videoPreview.height,
        x: videoPreview.offsetLeft,
        y: videoPreview.offsetTop,
        ratio: ratio,
      });

      console.log(`video info`, videoInfo, videoResize);
      console.log(`MAIN: get video infomation`, videoInfo);
      updateNumberOfSection(
        Math.floor(videoPreview.duration / processWindow) + 1,
      );
      console.log(`MAIN: this is the size of sections ${numberOfSection}`);

      // Creates file reader to read video file as an array buffer
      const reader = new FileReader();
      reader.readAsArrayBuffer(videoFile);
      reader.onload = function (): void {
        updateVideoBuffer(reader.result as ArrayBuffer);
        console.log(`MAIN: video converted to array buffer`, videoBuffer);
        for (let i = 0; i < ffmpegWorkers.length; i++) {
          ffmpegWorkers[i].postMessage({
            type: 'videoData',
            video: videoBuffer,
            workerId: i,
          });
        }
        getAudioOfVideo();
        resolve('success');
      };
    };
  });
  promise.then((): void => {
    // Makes card1 invisiable, card2 display.
    card1.style.display = 'none';
    card2.style.display = 'flex';
    putMiddle();
    startWorker();
  });
}

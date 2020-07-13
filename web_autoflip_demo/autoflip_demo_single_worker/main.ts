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
/** Reads input video as an array buffer */

var myWorker = new Worker('worker.js');
var videoBuffer = {} as ArrayBuffer;
var videoInfo = {} as { duration: number; width: number; height: number };

// Adds onchange event to input element
const inputVideo = <HTMLInputElement>document.querySelector('#video-upload');
inputVideo.onchange = handleOnChange;
// Adds onchange event to input element
const startButton = <HTMLButtonElement>document.querySelector('#start-worker');
startButton.onclick = startWorker;

/** Handles onChange event */
function handleOnChange(event: Event): void {
  let input = event.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  let videoFile = input.files[0];
  console.log(`MAIN: video file has been chosen`, videoFile);
  // Previews the upload video
  const videoURL = URL.createObjectURL(videoFile);
  const videoPerview = <HTMLVideoElement>document.querySelector('#video-preview');
  videoPerview.src = `${videoURL}#t=0, videoCropInfo.endTime`;

  // create element to load video data to fetch video duration, height, width
  var videoLoad = document.createElement('video');
  videoLoad.preload = 'metadata';
  videoLoad.onloadedmetadata = function () {
    window.URL.revokeObjectURL(videoLoad.src);
    videoInfo = { duration: videoLoad.duration, height: videoLoad.videoHeight, width: videoLoad.videoWidth };
    console.log(`MAIN: get video infomation`, videoInfo);
  };

  // Creates file reader to read video file as an array buffer
  const reader = new FileReader();
  reader.onload = function (): void {
    videoBuffer = reader.result as ArrayBuffer;
    console.log(`MAIN: video converted to array buffer`, videoBuffer);
  };

  reader.readAsArrayBuffer(videoFile);
  videoLoad.src = URL.createObjectURL(videoFile);
}

/** Starts workers to process ffmpeg and autoflip */
function startWorker(): void {
  console.log(`MAIN: worker started!`);
  console.log(`MAIN: send video buffer to worker`);
  myWorker.postMessage({
    video: videoBuffer,
    width: videoInfo.width,
    height: videoInfo.height,
    start: 0,
    window: 10,
  });
  myWorker.onmessage = function (e: MessageEvent): void {
    console.log(`MAIN: Crop information received from worker`, e.data);
    // apply the cropInfo to current display video
    renderCroppedVideo(e.data);
  };
}

/** Displays cropped video */
function renderCroppedVideo(videoCropInfo: any): void {
  var cropInfo = videoCropInfo.cropWindows;
  cropInfo = remainChanged(cropInfo);
  console.log(`MAIN: only keep the changed crop windows, one entry for continuous same windows`, cropInfo);
  var shotsInfo = videoCropInfo.shots;
  console.log(`MAIN: result shots`, shotsInfo);
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
  const videoURL = URL.createObjectURL(videoBlob);
  // Adds event for changing the crop windows when displaying
  const video = <HTMLVideoElement>document.querySelector('#video-display');
  video.src = `${videoURL}#t=0, videoCropInfo.endTime`;

  video.addEventListener('timeupdate', function (): void {
    const leftBox = <SVGRectElement>document.querySelector('#leftBox');
    const rightBox = <SVGRectElement>document.querySelector('#rightBox');
    const videoDisplayWidth = (video.height / videoInfo.height) * videoInfo.width;
    const offset = (video.width - videoDisplayWidth) / 2;
    // width: 0.5625, height: 1, x: 0.21875, y: 0, time: 0
    for (let i = 0; i < cropInfo.length; i++) {
      if (this.currentTime > cropInfo[i].time) {
        leftBox.setAttribute('x', `${offset}`);
        leftBox.style.width = `${videoDisplayWidth * cropInfo[i].x}`;
        rightBox.setAttribute('x', `${videoDisplayWidth * (cropInfo[i].x + cropInfo[i].width) + offset}`);
        rightBox.style.width = `${videoDisplayWidth * (1 - cropInfo[i].x - cropInfo[i].width)}`;
      }
    }
  });
}

/** Remains the changed crop windows */
function remainChanged(cropInfo: any) {
  var remained = [];
  var pre = JSON.stringify(cropInfo[0]);
  cropInfo[0]['time'] = 0;
  remained.push(cropInfo[0]);
  for (let i = 1; i < cropInfo.length; i++) {
    if (pre !== JSON.stringify(cropInfo[i])) {
      pre = JSON.stringify(cropInfo[i]);
      cropInfo[i]['time'] = ((1 / 15) * i).toFixed(3);
      remained.push(cropInfo[i]);
    }
  }
  return remained;
}

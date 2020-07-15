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

/** The interface defines a cropping information object*/
interface CropInfo {
  // the information type, like "finishedAnalysis", "sectionAnalysis"
  type: string;
  // the crop windows for processed frames
  cropWindows: CropWindow[];
  // the shots positions for processed frames
  shots: number[];
}

/** The interface defines a cropping window object for a single frame*/
interface CropWindow {
  // the width of the crop window
  width: number;
  // the height of the crop window
  height: number;
  // the x position of left top point of the crop window
  x: number;
  // the y position of left top point of the crop window
  y: number;
  // the time position of the corresponding frame in video progress
  time: number;
}

/** The interface defines a video information object*/
interface VideoInfo {
  // the duration of the video
  duration: number;
  // the width of the video dimension
  width: number;
  // the height of the video dimension
  height: number;
}

const myWorker = new Worker('worker.js');
let videoBuffer: ArrayBuffer = new ArrayBuffer(1);
let videoInfo: VideoInfo = { duration: 0, width: 0, height: 0 };

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
  const videoPerview = <HTMLVideoElement>(
    document.querySelector('#video-preview')
  );
  videoPerview.src = `${videoURL}#t=0, videoCropInfo.endTime`;

  // Creates element to load video data to fetch video duration, height, width
  const videoLoad = document.createElement('video');
  videoLoad.preload = 'metadata';
  videoLoad.onloadedmetadata = function (): void {
    window.URL.revokeObjectURL(videoLoad.src);
    videoInfo = {
      duration: videoLoad.duration,
      height: videoLoad.videoHeight,
      width: videoLoad.videoWidth,
    };
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

/** Starts my worker to process ffmpeg and autoflip */
function startWorker(): void {
  console.log(`MAIN: workers started!`);
  console.log(`MAIN: send video array buffer to the worker!`);
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
    console.log(`MAIN: render the recevied video crop windows`);
    renderCroppedVideo(e.data);
  };
}

/** Displays cropped video */
function renderCroppedVideo(videoCropInfo: CropInfo): void {
  let cropInfo = videoCropInfo.cropWindows;
  cropInfo = remainChanged(cropInfo);
  console.log(
    `MAIN: only keep the changed crop windows, one entry for continuous same windows`,
    cropInfo,
  );
  let shotsInfo = videoCropInfo.shots;
  console.log(`MAIN: result shots`, shotsInfo);
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
  const videoURL = URL.createObjectURL(videoBlob);
  // Adds event for changing the crop windows when displaying
  const video = <HTMLVideoElement>document.querySelector('#video-display');
  video.src = `${videoURL}#t=0, videoCropInfo.endTime`;
  video.addEventListener('timeupdate', function (): void {
    const leftBox = <SVGRectElement>document.querySelector('#leftBox');
    const rightBox = <SVGRectElement>document.querySelector('#rightBox');
    const videoDisplayWidth =
      (video.height / videoInfo.height) * videoInfo.width;
    const offset = (video.width - videoDisplayWidth) / 2;
    // crop window example: width: 0.5625, height: 1, x: 0.21875, y: 0, time: 0
    for (let i = 0; i < cropInfo.length; i++) {
      if (this.currentTime > cropInfo[i].time) {
        leftBox.setAttribute('x', `${offset}`);
        leftBox.style.width = `${videoDisplayWidth * cropInfo[i].x}`;
        rightBox.setAttribute(
          'x',
          `${videoDisplayWidth * (cropInfo[i].x + cropInfo[i].width) + offset}`,
        );
        rightBox.style.width = `${
          videoDisplayWidth * (1 - cropInfo[i].x - cropInfo[i].width)
        }`;
      }
    }
  });
}

/** Remains the changed crop windows */
function remainChanged(cropInfo: CropWindow[]) {
  let remained = [];
  let pre = JSON.stringify(cropInfo[0]);
  cropInfo[0]['time'] = 0;
  remained.push(cropInfo[0]);
  for (let i = 1; i < cropInfo.length; i++) {
    if (pre !== JSON.stringify(cropInfo[i])) {
      pre = JSON.stringify(cropInfo[i]);
      cropInfo[i]['time'] = Number(((1 / 15) * i).toFixed(3));
      remained.push(cropInfo[i]);
    }
  }
  return remained;
}

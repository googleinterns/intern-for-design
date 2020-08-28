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
const processWindow = 2;
let videoBuffer: ArrayBuffer;
let videoInfo: VideoInfo;
let size: number = 0;
let videoFile: File;
let videoResize: Resize;
let shotArray: number[] = [];
let userInput = { inputWidth: 1, inputHeight: 1 };
let frameIdTill: number = 0;
let cyclesCropWindows: any = {};
let handlers: any = {};
let expected: any = {};
let resultVideos: any = {};
let autoflipFree: boolean = true;
let countf: number = 0;
let counta: number = 0;
let finished: boolean[] = [];
let leftWidth: number = 250;
let rightWidth: number = 250;
let topDownHeight: number = 50;
let timestampHeadMs: number = 0;
let isMasked: boolean = false;
let curFaceDetection: faceDetectRegion[];
let audio: ArrayBuffer;

const video = <HTMLVideoElement>document.querySelector('#video-display');
const videoPlay = <HTMLVideoElement>document.getElementById('video-play');
const card1 = <HTMLDivElement>document.querySelector('#card1');
const card2 = <HTMLDivElement>document.querySelector('#card2');
const card3 = <HTMLDivElement>document.querySelector('#card3');
const card4 = <HTMLDivElement>document.querySelector('#card4');
const card31 = <HTMLDivElement>document.querySelector('#card31');
const logHistory = <HTMLDivElement>document.querySelector('#history');
const videoSection = <HTMLDivElement>document.querySelector('#video-section');
const topBox = <SVGRectElement>document.querySelector('#topBox');
const middleBox = <SVGRectElement>document.querySelector('#middleBox');
const middleBoxFrame = <SVGRectElement>(
  document.querySelector('#middleBoxFrame')
);
const leftBox = <SVGRectElement>document.querySelector('#leftBox');
const rightBox = <SVGRectElement>document.querySelector('#rightBox');
const downBox = <SVGRectElement>document.querySelector('#downBox');
const maskSide = <SVGSVGElement>document.querySelector('#mask-side');
const maskMiddle = <SVGRectElement>document.querySelector('#mask-middle');
const detectionBoundingBox = <SVGSVGElement>(
  document.querySelector('#detection-bounding-box')
);
const canvas: any = document.getElementById('canvas');
const timerDisplay = <HTMLSpanElement>(
  document.getElementById('safeTimerDisplay')
);

// Adds event to html element.
const inputVideo = <HTMLInputElement>document.querySelector('#video-upload');
const aspectWidth = <HTMLInputElement>document.querySelector('#aspect-weight');
const aspectHeight = <HTMLInputElement>document.querySelector('#aspect-height');
inputVideo.onchange = handleOnChange;

// Centers the video element when page load.
putMiddle();

/** Handles onChange event of input video element. */
function handleOnChange(event: Event): void {
  let promise = new Promise(function (resolve: any): void {
    if (videoFile === undefined) {
      let input = <HTMLInputElement>event.target;
      if (!input.files || !input.files[0]) return;
      videoFile = input.files[0];
    }
    console.log(`MAIN: video file has been chosen`, videoFile);

    const videoURL = URL.createObjectURL(videoFile);
    video.src = videoURL;
    videoPlay.src = videoURL;
    video.preload = 'metadata';
    video.onloadedmetadata = function (): void {
      videoInfo = {
        duration: video.duration,
        height: video.videoHeight,
        width: video.videoWidth,
      };
      const ratio = video.width / video.videoWidth;
      video.height = ratio * video.videoHeight;
      videoResize = {
        width: video.width,
        height: video.height,
        x: video.offsetLeft,
        y: video.offsetTop,
        ratio: ratio,
      };
      console.log(`video info`, videoInfo, videoResize);
      console.log(`MAIN: get video infomation`, videoInfo);
      size = Math.floor(video.duration / processWindow) + 1;
      console.log(`MAIN: this is the size of sections ${size}`);

      // Creates file reader to read video file as an array buffer
      const reader = new FileReader();
      reader.readAsArrayBuffer(videoFile);
      reader.onload = function (): void {
        videoBuffer = reader.result as ArrayBuffer;
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

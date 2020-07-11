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

// Creates fixed workers (ffmpeg: 4, autoflip: 1)
const ffmpegWorkers: Worker[] = [
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
];
const autoflipWorker = new Worker('autoflip_worker.js');
const processWindow = 2;

var videoBuffer = {} as ArrayBuffer;
var videoInfo = {} as { duration: number; width: number; height: number };
var size: number = 0;

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
  let videofile = input.files[0];
  console.log('MAIN: video file has been chosen');
  console.log(videofile);

  // Previews the upload video
  const videoURL = URL.createObjectURL(videofile);
  const videoPerview = <HTMLVideoElement>document.querySelector('#video-preview');
  videoPerview.src = `${videoURL}#t=0, videoCropInfo.endTime`;

  // Creates element to load video data to fetch video duration, height, width
  const videoLoad = document.createElement('video');
  videoLoad.preload = 'metadata';
  videoLoad.onloadedmetadata = function (): void {
    window.URL.revokeObjectURL(videoLoad.src);
    videoInfo = { duration: videoLoad.duration, height: videoLoad.videoHeight, width: videoLoad.videoWidth };
    console.log(videoInfo);

    size = Math.floor(videoLoad.duration / processWindow) + 1;
    console.log(size);
    console.log(`MAIN: this is the size of sections ${size}`);
    console.log(ffmpegWorkers);
  };

  // Creates file reader to read video file as an array buffer
  const reader = new FileReader();
  reader.onload = function (): void {
    videoBuffer = reader.result as ArrayBuffer;
    console.log('Main: video converted to array buffer');
  };

  reader.readAsArrayBuffer(videofile);
  videoLoad.src = URL.createObjectURL(videofile);
}

/** Starts workers to process ffmpeg and autoflip */
function startWorker(): void {
  console.log(`MAIN: workers started!`);
  const videoLength = videoInfo.duration;
  console.log('MAIN: this is the videoLength ' + videoLength);
  var start = 0;
  var videoId = 0;
  var workerId = 0;
  while (start < videoLength) {
    if (start + processWindow >= videoLength) {
      console.log(`MAIN : END: send the last video (${videoId}) to worker ${workerId}`);
      ffmpegWorkers[workerId].postMessage({
        video: videoBuffer,
        videoId: videoId,
        workerId: workerId,
        startTime: start,
        workWindow: processWindow,
        end: true,
      });
    } else {
      console.log(`MAIN: PROCESS: send the video (${videoId}) to worker ${workerId}`);
      ffmpegWorkers[workerId].postMessage({
        video: videoBuffer,
        videoId: videoId,
        workerId: workerId,
        startTime: start,
        workWindow: processWindow,
        end: false,
      });
    }
    /** Sends the output frames from ffmpeg to autoflip worker */
    ffmpegWorkers[workerId].onmessage = function (e: MessageEvent): void {
      console.log(`MAIN: Frames(${e.data.videoId}) received from worker ${e.data.workerId}`);
      console.log(e.data);
      // Applys the cropInfo to current display video
      autoflipWorker.postMessage({
        frames: e.data.videoFrames,
        videoId: e.data.videoId,
        workerId: e.data.workerId,
        width: videoInfo.width,
        height: videoInfo.height,
        startTime: e.data.startTime,
        end: e.data.end,
        size: size,
      });
    };
    start += processWindow;
    //Loops to assign the worker
    if (workerId === 3) {
      workerId = 0;
    } else {
      workerId++;
    }
    videoId++;
  }

  /** Renders video once got the result from autoflip */
  autoflipWorker.onmessage = function (e: MessageEvent) {
    console.log(`MAIN: All frames received from worker ${e.data.workerId}`);
    console.log(e.data);
    // apply the cropInfo to current display video
    console.log(`MAIN: render the video crop windows`);
    renderCroppedVideo(e.data);
  };
}

/** Displays cropped video */
function renderCroppedVideo(videoCropInfo: any): void {
  console.log(`MAIN: render function started`);
  const cropInfo = videoCropInfo.cropWindows;
  console.log(cropInfo);
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
  const videoURL = URL.createObjectURL(videoBlob);
  // Adds event for changing the crop windows when displaying
  const video = <HTMLVideoElement>document.querySelector('#video-display');
  video.src = `${videoURL}#t=0, videoCropInfo.endTime`;
  video.addEventListener('timeupdate', function (): void {
    const leftBox = <SVGRectElement>document.querySelector('#leftBox');
    const rightBox = <SVGRectElement>document.querySelector('#rightBox');
    // width: 0.5625, height: 1, x: 0.21875, y: 0, time: 0
    for (var i = 0; i < cropInfo.length; i++) {
      if (this.currentTime > i * (1 / 15)) {
        leftBox.style.width = `${video.width * cropInfo[i].x}`;
        rightBox.setAttribute('x', `${video.width * (cropInfo[i].x + cropInfo[i].width)}`);
        rightBox.style.width = `${video.width * (1 - cropInfo[i].x - cropInfo[i].width)}`;
      }
    }
  });
}

/** Remains the changed crop windows */
/*
function remainChanged(cropInfo: any, startTime: number): any[] {
  var remained = [];
  var pre = JSON.stringify(cropInfo[0]);
  cropInfo[0]['time'] = 0 + startTime;
  remained.push(cropInfo[0]);
  for (var i = 1; i < cropInfo.length; i++) {
    if (pre !== JSON.stringify(cropInfo[i])) {
      pre = JSON.stringify(cropInfo[i]);
      cropInfo['time'] = (1 / 15) * i + startTime;
      remained.push(cropInfo[i]);
    }
  }
  return remained;
}
*/

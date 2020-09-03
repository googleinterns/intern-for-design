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
  cropWindowStorage,
  videoBuffer,
  audio,
  updateAudio,
  outputStorage,
} from './globals';

import {
  videoPreview,
  canvas,
  videoRecord,
  card2,
  card4,
  timerDisplay,
} from './globals_dom';

import { ffmpegWorkerCombine, ffmpegWorkerAudio } from './globals_worker';
import { convertDoubleToString } from './utilsCrop';
import { putMiddle } from './centerContent';
const canvas2D = canvas.getContext('2d') as CanvasRenderingContext2D;

let videoCropX = 0;
let videoCropY = 0;
let videoCropWidth = 1920;
let videoCropHeight = 1080;
let mediaRecorder: MediaRecorder;
let recordedBlobs: Blob[];
let output: ArrayBuffer;
let stream: any;
let aspectHeight: number;
let aspectWidth: number;
let renderDimension: Rect;
let cropWindows: ExternalRenderingInformation[];

/**
 * Creates a downloadable cropped video file using canvas drawing
 * and mediaRecorder recording. The canvas drawing and recording starts
 * when the video is playing and stops when the video is end or paused.
 * The final downloadable file creates when the download button clicks.
 */
export function createDownload(inputWidth: number, inputHeight: number): void {
  aspectWidth = inputWidth;
  aspectHeight = inputHeight;
  cropWindows = cropWindowStorage[`${aspectHeight}&${aspectWidth}`];
  renderDimension = cropWindows[0].renderToLocation as Rect;
  canvas.width = renderDimension.width;
  canvas.height = renderDimension.height;

  // Pauses the main preview video player to ensure recording quality
  setTimeout(() => videoPreview.pause(), 100);
  videoPreview.currentTime = 0;
  videoRecord.play();
  startRecording();
  loop();
}

/**
 * Draws canvas in loop in 1000/35=28 fps.
 * Send data to recorder after each drawing and
 * stops looping and recording when video is end
 * or paused.
 */
function loop() {
  canvas2D.imageSmoothingEnabled = false;
  if (!videoRecord.paused && !videoRecord.ended) {
    canvas2D.drawImage(
      videoRecord,
      videoCropX,
      videoCropY,
      videoCropWidth,
      videoCropHeight,
      0,
      0,
      renderDimension.width,
      renderDimension.height,
    );
    stream.getVideoTracks()[0].requestFrame();
    setTimeout(loop, 35);
  } else {
    stopRecording();
  }
}

/** Handles event when the recorder receives any data. */
function handleDataAvailable(event: BlobEvent): void {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

/** Starts mediaRecorder recording with a timer. */
function startRecording(): void {
  videoRecord.play();
  stream = canvas.captureStream(0);
  const options = { mimeType: 'video/webm;codecs=h264' };
  recordedBlobs = [];
  mediaRecorder = new MediaRecorder(stream, options);
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log('DOWNLOAD: Recorder started.');
  card2.style.display = 'none';
  card4.style.display = 'block';
  timer();
}

function handleStop(event: Event): void {
  console.log('DOWNLOAD: Recorder stopped.');
  const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
  generateVideo(superBuffer);
}

/** Stops mediaRecorder recording and then process the video output. */
function stopRecording(): void {
  mediaRecorder.stop();
}

/** Creates the downloable file and download. */
function download(inputWidth: number, inputHeight: number): void {
  const blob = new Blob([outputStorage[`${inputWidth}&${inputHeight}`]], {
    type: 'video/mp4',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.mp4';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Process video output to combine the muted recorded Blob
 * with the pre-extracted video audio.
 */
function generateVideo(blob: Blob): void {
  let muted: ArrayBuffer;

  // Creates file reader to read muted video file as an array buffer
  blob.arrayBuffer().then((buffer): void => {
    muted = buffer;
    ffmpegWorkerCombine.postMessage({
      type: 'combineVideo',
      audioVideo: audio,
      mutedVideo: muted,
    });
  });

  ffmpegWorkerCombine.onmessage = function (e: MessageEvent): void {
    output = e.data.data.buffers[0].data;
    console.log('MAIN: Main thread receive combined video', output);
    card2.style.display = 'flex';
    putMiddle();
    card4.style.display = 'none';
    outputStorage[`${aspectWidth}&${aspectHeight}`] = output;
    download(aspectWidth, aspectHeight);
    let width = convertDoubleToString(aspectWidth);
    let height = convertDoubleToString(aspectHeight);
    const downloadButton = <HTMLButtonElement>(
      document.querySelector(`#download-${width}-${height}`)
    );
    downloadButton.onclick = null;
    const wrapFunctionDownload = download.bind(e, aspectWidth, aspectHeight);
    downloadButton.addEventListener('click', wrapFunctionDownload);
  };
}

videoRecord.addEventListener('timeupdate', function (): void {
  for (let i = 0; i < cropWindows.length; i++) {
    let cropWindowForFrame = cropWindows[i].cropFromLocation as Rect;
    if (videoRecord.currentTime > i * (1 / 15)) {
      videoCropX = cropWindowForFrame.x;
      videoCropY = cropWindowForFrame.y;
      videoCropWidth = cropWindowForFrame.width;
      videoCropHeight = cropWindowForFrame.height;
    }
  }
});

/** Converts the seconds to MM:SS string format. */
function time_format(seconds: number): string {
  const m: string =
    Math.floor(seconds / 60) < 10
      ? '0' + Math.floor(seconds / 60)
      : '' + Math.floor(seconds / 60);
  const s: string =
    Math.floor(seconds - Number(m) * 60) < 10
      ? '0' + Math.floor(seconds - Number(m) * 60)
      : '' + Math.floor(seconds - Number(m) * 60);
  return m + ':' + s;
}

/** Starts timer and display in DOM. */
function timer(): void {
  let sec = 0;
  const timer = setInterval(function (): void {
    timerDisplay.innerHTML = time_format(sec);
    sec++;
    if (card4.style.display === 'none') {
      clearInterval(timer);
    }
  }, 1000);
}

/** Extract the audio from the input video */
export function getAudioOfVideo(): void {
  ffmpegWorkerAudio.postMessage({
    type: 'videoData',
    video: videoBuffer,
  });
  ffmpegWorkerAudio.onmessage = function (e: MessageEvent): void {
    console.log('MAIN: Main thread receive audio', e.data);
    if (e.data.data.buffers.length !== 0) {
      updateAudio(e.data.data.buffers[0].data);
    }
  };
}

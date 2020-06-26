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

declare let buffer: ArrayBuffer;

/** Read input video as an array buffer */
function videoToBuffer(): void {
  const file = (<HTMLInputElement>event.target).files[0];
  console.log('video file has been chosen');
  console.log(file);
  const reader = new FileReader();
  reader.onload = function (): void {
    buffer = reader.result as ArrayBuffer;
    console.log('video converted to array buffer');
  };
  reader.readAsArrayBuffer(file);
}

/** Start a new worker */
function startWorker(): void {
  const myWorker = new Worker('worker.js');
  myWorker.postMessage(buffer);
  console.log('passed array buffer to web worker');
  myWorker.onmessage = function (e): void {
    console.log(e.data);
    console.log('video received from worker');
    // render the received video
    renderVideo(e.data);
  };
}

/** Display video content */
function renderVideo(videoBuffer: ArrayBuffer): void {
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp3' });
  const objectURL = URL.createObjectURL(videoBlob);
  document.getElementById('data-vid').innerHTML = `<video width='400' controls>
    <source id='vid-source' src= ${objectURL} 'type='video/mp4'>
    </video>`;
  document.getElementById('name-vid').innerHTML = videoBlob.type;
}

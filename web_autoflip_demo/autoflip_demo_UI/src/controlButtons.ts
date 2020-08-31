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

import { shotStorage } from './globals';

import { leftBox, rightBox, downBox, topBox } from './globals_dom';

const shotButton = <HTMLLIElement>document.querySelector('#shot-button');
shotButton.onclick = nextShot;

const maskButton = <HTMLLIElement>document.querySelector('#mask-button');
maskButton.onclick = maskVideo;

/** Moves the time of the video to the next shot position. */
function nextShot(): void {
  const videoPerview = <HTMLVideoElement>(
    document.querySelector('#video-display')
  );
  const time: number = videoPerview.currentTime;
  for (let i = 0; i < shotStorage.length; i++) {
    if (shotStorage[i] / 1000000 > time) {
      videoPerview.currentTime = shotStorage[i] / 1000000;
      return;
    }
  }
  videoPerview.currentTime = shotStorage[0];
}

/** Masks the cropped part of the video. */
function maskVideo(): void {
  if (leftBox.style.fill === 'white') {
    maskButton.innerHTML = 'Mask';
    leftBox.style.fill = 'black';
    rightBox.style.fill = 'black';
    downBox.style.fill = 'black';
    topBox.style.fill = 'black';
    leftBox.setAttribute('fill-opacity', '50%');
    rightBox.setAttribute('fill-opacity', '50%');
    downBox.setAttribute('fill-opacity', '50%');
    topBox.setAttribute('fill-opacity', '50%');
  } else {
    maskButton.innerHTML = 'Show Original';
    leftBox.style.fill = 'white';
    rightBox.style.fill = 'white';
    downBox.style.fill = 'white';
    topBox.style.fill = 'white';
    leftBox.setAttribute('fill-opacity', '100%');
    rightBox.setAttribute('fill-opacity', '100%');
    downBox.setAttribute('fill-opacity', '100%');
    topBox.setAttribute('fill-opacity', '100%');
  }
}

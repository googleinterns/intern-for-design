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
  shotStorage,
  signalHandlerStorage,
  borderHandlerStorage,
  curAspectRatio,
  showSignaled,
  updateShowSignaled,
  updateCurFaceDetection,
  updateCurBorderDetection,
  showBordered,
  updateShowBordered,
} from './globals';

import {
  leftBox,
  rightBox,
  downBox,
  topBox,
  videoPreview,
} from './globals_dom';

import * as d3 from 'd3';

const shotButton = <HTMLLIElement>document.querySelector('#shot-button');
shotButton.onclick = nextShot;

const maskButton = <HTMLLIElement>document.querySelector('#mask-button');
maskButton.onclick = maskVideo;

const signalButton = <HTMLLIElement>document.querySelector('#signal-button');
signalButton.onclick = showSignal;

const borderButton = <HTMLLIElement>document.querySelector('#border-button');
borderButton.onclick = showBorder;

/** Shows the detection of all the signals detected by autoflip. */
function showSignal(): void {
  const signalHandlersCurrent =
    signalHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  if (showSignaled) {
    signalButton.innerHTML = 'Show Signal';
    updateShowSignaled(false);
    const svg = d3.select('#detection-bounding-box-face');
    svg.selectAll('*').remove();
    updateCurFaceDetection([]);
    for (let i = 0; i < signalHandlersCurrent.length; i++) {
      videoPreview.removeEventListener('timeupdate', signalHandlersCurrent[i]);
    }
  } else {
    signalButton.innerHTML = 'Hidden Signal';
    updateShowSignaled(true);
    for (let i = 0; i < signalHandlersCurrent.length; i++) {
      videoPreview.addEventListener('timeupdate', signalHandlersCurrent[i]);
    }
  }
}

/** Shows the detection of borders detecetd by autoflip. */
function showBorder(): void {
  const borderHandlersCurrent =
    borderHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  if (showBordered) {
    borderButton.innerHTML = 'Show Border';
    updateShowBordered(false);
    const svg = d3.select('#detection-bounding-box-border');
    svg.selectAll('*').remove();
    updateCurBorderDetection([]);
    for (let i = 0; i < borderHandlersCurrent.length; i++) {
      videoPreview.removeEventListener('timeupdate', borderHandlersCurrent[i]);
    }
  } else {
    borderButton.innerHTML = 'Hidden Border';
    updateShowBordered(true);
    for (let i = 0; i < borderHandlersCurrent.length; i++) {
      videoPreview.addEventListener('timeupdate', borderHandlersCurrent[i]);
    }
  }
}

/** Moves the time of the video to the next shot position. */
function nextShot(): void {
  const time: number = videoPreview.currentTime;
  for (let i = 0; i < shotStorage.length; i++) {
    if (shotStorage[i] / 1000000 > time) {
      videoPreview.currentTime = shotStorage[i] / 1000000;
      return;
    }
  }
  videoPreview.currentTime = shotStorage[0];
}

/** Masks the cropped part of the video. */
function maskVideo(): void {
  if (leftBox.style.fill === 'white') {
    maskButton.innerHTML = 'Show Mask';
    leftBox.style.fill = 'black';
    rightBox.style.fill = 'black';
    downBox.style.fill = 'black';
    topBox.style.fill = 'black';
    leftBox.setAttribute('fill-opacity', '50%');
    rightBox.setAttribute('fill-opacity', '50%');
    downBox.setAttribute('fill-opacity', '50%');
    topBox.setAttribute('fill-opacity', '50%');
  } else {
    maskButton.innerHTML = 'Hidden Mask';
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

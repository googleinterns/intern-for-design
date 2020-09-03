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
  cropHandlerStorage,
  signalHandlerStorage,
  borderHandlerStorage,
  curAspectRatio,
  sectionIndexStorage,
  cropWindowStorage,
  numberOfSection,
  processWindow,
  videoInfo,
  countAutoflip,
  updateCountAutoflip,
  showSignaled,
  showBordered,
  finished,
} from './globals';

import { videoPreview } from './globals_dom';
import { autoflipWorker } from './globals_worker';

import { updateAutoflipBar } from './utilsCrop';
import { addHistoryButton } from './videoHandle';

const changeAspectForm = <HTMLFormElement>(
  document.querySelector('#change-aspect-form')
);
const changeAspectWidth = <HTMLInputElement>(
  document.querySelector('#change-aspect-width')
);
const changeAspectHeight = <HTMLInputElement>(
  document.querySelector('#change-aspect-height')
);

changeAspectForm.onsubmit = handleChangeAspect;

/** handle function when submitting a new aspect ratio */
function handleChangeAspect(e: Event): void {
  e.preventDefault();
  const changeInputHeight = changeAspectHeight.value;
  const changeInputWidth = changeAspectWidth.value;
  if (Number(changeInputHeight) === 0 || Number(changeInputWidth) === 0) {
    alert('Please enter positive number greater then 0');
    return;
  }
  if (!finished[0]) {
    alert('Wait a moment to change aspect ratio!');
    return;
  }
  changeAspect(Number(changeInputHeight), Number(changeInputWidth));
}

export function changeAspect(
  changeInputHeight: number,
  changeInputWidth: number,
) {
  const preCropHandlers =
    cropHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  for (let i = 0; i < preCropHandlers.length; i++) {
    videoPreview.removeEventListener('timeupdate', preCropHandlers[i]);
  }
  if (showSignaled) {
    const preSignalHandlers =
      signalHandlerStorage[
        `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
      ];
    for (let i = 0; i < preSignalHandlers.length; i++) {
      videoPreview.removeEventListener('timeupdate', preSignalHandlers[i]);
    }
  }
  if (showBordered) {
    const preBorderHandlers =
      borderHandlerStorage[
        `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
      ];
    for (let i = 0; i < preBorderHandlers.length; i++) {
      videoPreview.removeEventListener('timeupdate', preBorderHandlers[i]);
    }
  }

  curAspectRatio.inputWidth = changeInputWidth;
  curAspectRatio.inputHeight = changeInputHeight;

  if (
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] === undefined
  ) {
    addHistoryButton();
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    cropHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    signalHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    borderHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = 0;
  }
  const expect =
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  const windows =
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  const curVideoId = Math.floor(windows.length / 30);
  updateCountAutoflip(windows.length);
  updateAutoflipBar(countAutoflip);

  const cropHandlersCurrent =
    cropHandlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  for (let i = 0; i < cropHandlersCurrent.length; i++) {
    videoPreview.addEventListener('timeupdate', cropHandlersCurrent[i]);
  }
  if (showSignaled) {
    const signalHandlersCurrent =
      signalHandlerStorage[
        `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
      ];
    for (let i = 0; i < signalHandlersCurrent.length; i++) {
      videoPreview.addEventListener('timeupdate', signalHandlersCurrent[i]);
    }
  }
  if (showBordered) {
    const borderHandlersCurrent =
      borderHandlerStorage[
        `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
      ];
    for (let i = 0; i < borderHandlersCurrent.length; i++) {
      videoPreview.addEventListener('timeupdate', borderHandlersCurrent[i]);
    }
  }
  if (numberOfSection === Math.ceil(windows.length / 30)) {
  } else {
    autoflipWorker.postMessage({
      type: 'changeAspectRatio',
      videoId: Math.floor(windows.length / 30),
      startId: windows.length,
      startTime: expect * processWindow,
      width: videoInfo.width,
      height: videoInfo.height,
      end: curVideoId === numberOfSection - 1,
      user: curAspectRatio,
    });
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = Math.floor(windows.length / 30) + 1;
  }
}

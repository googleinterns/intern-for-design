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
  handlerStorage,
  curAspectRatio,
  sectionIndexStorage,
  cropWindowStorage,
  numberOfSection,
  processWindow,
  videoInfo,
  countAutoflip,
  updateCountAutoflip,
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

function handleChangeAspect(e: Event): void {
  e.preventDefault();
  const changeInputHeight = changeAspectHeight.value;
  const changeInputWidth = changeAspectWidth.value;
  changeAspect(Number(changeInputHeight), Number(changeInputWidth));
}

export function changeAspect(
  changeInputHeight: number,
  changeInputWidth: number,
) {
  const preHandlers =
    handlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  console.log(`The user input is`, changeInputHeight, changeInputWidth);

  curAspectRatio.inputWidth = changeInputWidth;
  curAspectRatio.inputHeight = changeInputHeight;
  for (let i = 0; i < preHandlers.length; i++) {
    videoPreview.removeEventListener('timeupdate', preHandlers[i]);
  }

  console.log(`check if exist!`);
  if (
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] === undefined
  ) {
    console.log(`notexsit!`);
    addHistoryButton();
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    handlerStorage[
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

  const handlersCurrent =
    handlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  for (let i = 0; i < handlersCurrent.length; i++) {
    videoPreview.addEventListener('timeupdate', handlersCurrent[i]);
  }
  if (numberOfSection === Math.ceil(windows.length / 30)) {
  } else {
    console.log(
      `post startID`,
      windows.length,
      Math.floor(windows.length / 30),
    );
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

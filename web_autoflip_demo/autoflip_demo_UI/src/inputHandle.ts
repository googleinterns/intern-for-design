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
  curAspectRatio,
  numberOfSection,
  cropWindowStorage,
  handlerStorage,
  sectionIndexStorage,
} from './globals';
import { inputAspectWidth, inputAspectHeight } from './globals_dom';
import { addHistoryButton } from './videoHandle';

export function handleInput() {
  // Reads the user inputs for aspect ratio;
  const inputHeight = inputAspectHeight.value;
  const inputWidth = inputAspectWidth.value;
  console.log(`The user input is`, inputHeight, inputWidth);
  curAspectRatio.inputWidth = Number(inputWidth);
  curAspectRatio.inputHeight = Number(inputHeight);
  addHistoryButton();
  let finished: boolean[] = [];
  for (let i = 0; i < numberOfSection; i++) {
    finished[i] = false;
  }
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

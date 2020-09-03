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

/** Global constants for DOM elements. */
export const videoPreview = <HTMLVideoElement>(
  document.querySelector('#video-preview')
);
export const videoRecord = <HTMLVideoElement>(
  document.querySelector('#video-record')
);
export const card1 = <HTMLDivElement>document.querySelector('#card1');
export const card2 = <HTMLDivElement>document.querySelector('#card2');
export const card3 = <HTMLDivElement>document.querySelector('#card3');
export const card4 = <HTMLDivElement>document.querySelector('#card4');
export const card31 = <HTMLDivElement>document.querySelector('#card31');
export const logHistory = <HTMLDivElement>document.querySelector('#history');
export const videoSection = <HTMLDivElement>(
  document.querySelector('#video-section')
);
export const maskSide = <SVGSVGElement>document.querySelector('#mask-side');
export const topBox = <SVGRectElement>document.querySelector('#topBox');
export const leftBox = <SVGRectElement>document.querySelector('#leftBox');
export const rightBox = <SVGRectElement>document.querySelector('#rightBox');
export const downBox = <SVGRectElement>document.querySelector('#downBox');

export const maskMiddle = <SVGRectElement>(
  document.querySelector('#mask-middle')
);
export const middleBox = <SVGRectElement>document.querySelector('#middleBox');
export const middleBoxFrame = <SVGRectElement>(
  document.querySelector('#middleBoxFrame')
);
export const canvas: any = document.getElementById('canvas');
export const timerDisplay = <HTMLSpanElement>(
  document.getElementById('safeTimerDisplay')
);
export const inputAspectWidth = <HTMLInputElement>(
  document.querySelector('#aspect-width')
);
export const inputAspectHeight = <HTMLInputElement>(
  document.querySelector('#aspect-height')
);

export const videoControlSection = <HTMLInputElement>(
  document.querySelector('#video-play-control')
);

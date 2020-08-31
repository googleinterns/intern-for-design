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

import { leftWidth, topHeight } from './globals';

import {
  card31,
  middleBox,
  topBox,
  videoPreview,
  videoSection,
  videoControlSection,
} from './globals_dom';

/** Centers video section indludes video and SVG masking elements. */
export function putMiddle(): void {
  let left = (card31.offsetWidth - middleBox.clientWidth) / 2 - leftWidth;
  let top =
    (videoControlSection.offsetTop - middleBox.clientHeight) / 2 - topHeight;
  if (topBox.clientWidth === 0) {
    left = (card31.offsetWidth - videoPreview.offsetWidth) / 2;
    videoSection.style.width = `100%`;
    top = (videoControlSection.offsetTop - videoPreview.height) / 2;
  } else {
    if (left < 0) {
      left = 0;
    }
    if (top < 0) {
      top = 0;
    }
  }
  videoSection.style.marginLeft = `${left}px`;
  videoSection.style.marginTop = `${top}px`;
}

/** Centers the section of card3 with all the SVG elements. */
window.onresize = resizeHandler;
function resizeHandler(): void {
  let left =
    (card31.offsetWidth - middleBox.getBoundingClientRect().width) / 2 -
    leftWidth;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card31.offsetWidth - videoPreview.offsetWidth) / 2;
    videoSection.style.width = `100%`;
  } else {
    if (left < 0) {
      left = 0;
    }
  }
  videoSection.style.marginLeft = `${left}px`;
}

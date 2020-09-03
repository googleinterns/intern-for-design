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
 *
 * @jest-environment jsdom
 */

import { renderFaceRegion } from '../src/utilsCrop';

describe('Test util function for cropping', () => {
  document.body.innerHTML = `
  <svg id="detection-bounding-box-face" style="left:0;top:0;width:500;height:500;"></svg>
  <video id="video-preview" width="300px" height="300px"></video>
  `;
  test('Check add face dection box with right number before function', () => {
    const boundingBoxArea = document.getElementById(
      'detection-bounding-box-face',
    );
    expect(boundingBoxArea?.childElementCount).toBe(0);
  });

  test('Check add face dection box with right number after function', () => {
    const videoPreview = <HTMLVideoElement>(
      document.getElementById('video-preview')
    );
    const faceDetections: faceDetectRegion[] = [
      { faceRegion: { x: 0, y: 0, width: 100, height: 100 }, signalType: 1 },
      { faceRegion: { x: 0, y: 0, width: 100, height: 100 }, signalType: 2 },
      { faceRegion: { x: 0, y: 0, width: 100, height: 100 }, signalType: 3 },
    ];
    renderFaceRegion(faceDetections, videoPreview);
    const boundingBoxArea = document.getElementById(
      'detection-bounding-box-face',
    );
    expect(boundingBoxArea?.childElementCount).toBe(3);
  });
});

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
  videoInfo,
  videoResize,
  cropHandlerStorage,
  signalHandlerStorage,
  borderHandlerStorage,
  cropWindowStorage,
  sectionIndexStorage,
  countAutoflip,
  updateCountAutoflip,
  curFaceDetection,
  updateCurFaceDetection,
  curBorderDetection,
  updateCurBorderDetection,
  leftWidth,
  topHeight,
  rightWidth,
  shotStorage,
  updateLeftWidth,
  updateRightWidth,
  updateTopHeight,
  numberOfSection,
  updateTimeRender,
  showSignaled,
  showBordered,
} from './globals';

import {
  videoPreview,
  middleBox,
  rightBox,
  leftBox,
  middleBoxFrame,
  videoSection,
  maskSide,
  maskMiddle,
  topBox,
  downBox,
} from './globals_dom';

import { putMiddle } from './centerContent';
import { convertDoubleToString } from './inputHandle';

import * as d3 from 'd3';

/** Displays cropped window of the video. */
export function renderCroppedInfomation(videoCropInfo: CropInfo): void {
  const user = videoCropInfo.user;
  const cropInfo: ExternalRenderingInformation[] = videoCropInfo.cropWindows;
  const faceDetections: faceDetectRegion[][] = videoCropInfo.faceDetections;
  const borderDetections: BorderRegion[][] = videoCropInfo.borders;
  if (
    cropInfo.length === 0 &&
    faceDetections.length === 0 &&
    borderDetections.length === 0
  ) {
    return;
  }
  const cropWrappedFunc = cropTimeUpdateFunction.bind(videoPreview, cropInfo);
  const signalWrappedFunc = signalTimeUpdateFunction.bind(
    videoPreview,
    faceDetections,
  );
  const borderWrappedFunc = borderTimeUpdateFunction.bind(
    videoPreview,
    borderDetections,
  );
  cropHandlerStorage[
    `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
  ].push(cropWrappedFunc);
  signalHandlerStorage[
    `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
  ].push(signalWrappedFunc);
  borderHandlerStorage[
    `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
  ].push(borderWrappedFunc);

  if (cropInfo.length !== 0) {
    updateTimeRender(
      <number>cropInfo[cropInfo.length - 1].timestampUS / 1000000,
    );
  }
  for (let i = 0; i < cropInfo.length; i++) {
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ].push(cropInfo[i]);
  }

  updateCountAutoflip(
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ].length,
  );
  updateAutoflipBar(countAutoflip);
  console.log(`cycleWindows`, cropWindowStorage);
  console.log(`cropHandler`, cropHandlerStorage);
  console.log(`signalHandler`, signalHandlerStorage);
  console.log(`borderHandler`, borderHandlerStorage);
  console.log(`expected`, sectionIndexStorage);

  if (JSON.stringify(user) === JSON.stringify(curAspectRatio)) {
    videoPreview.addEventListener('timeupdate', cropWrappedFunc);
    if (showSignaled) {
      videoPreview.addEventListener('timeupdate', signalWrappedFunc);
    }
    if (showBordered) {
      videoPreview.addEventListener('timeupdate', borderWrappedFunc);
    }
  }
}

const cropTimeUpdateFunction = function (
  cropInfo: ExternalRenderingInformation[],
): void {
  for (let i = 0; i < cropInfo.length; i++) {
    if (videoPreview.currentTime > <number>cropInfo[i].timestampUS / 1000000) {
      scaleVideo(cropInfo[i]);
      setSideSVG(cropInfo[i]);
      setRenderSVG(cropInfo[i]);
      putMiddle();
      renderFaceRegion(curFaceDetection, videoPreview);
      renderBorderRegion(curBorderDetection, videoPreview);
    }
  }
};

const signalTimeUpdateFunction = function (
  faceDetections: faceDetectRegion[][],
): void {
  for (let i = 0; i < faceDetections.length; i++) {
    if (
      videoPreview.currentTime >
      <number>faceDetections[i][0].timestamp / 1000000
    ) {
      updateCurFaceDetection(faceDetections[i]);
      renderFaceRegion(faceDetections[i], videoPreview);
    }
  }
};

const borderTimeUpdateFunction = function (
  borderDetections: BorderRegion[][],
): void {
  for (let i = 0; i < borderDetections.length; i++) {
    if (
      videoPreview.currentTime >
      <number>borderDetections[i][0].timestamp / 1000000
    ) {
      updateCurBorderDetection(borderDetections[i]);
      renderBorderRegion(borderDetections[i], videoPreview);
    }
  }
};

/** Sets and displays middle SVG element as backgroud. */
function setRenderSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  //middleBox.style.display = 'block';
  const ratio = videoResize.ratio;

  middleBox.setAttribute('x', `${renderInfo.x * ratio + leftWidth} `);
  middleBox.setAttribute('y', `${renderInfo.y * ratio + topHeight}`);
  middleBox.style.width = `${renderInfo.width * ratio}`;
  middleBox.style.height = `${renderInfo.height * ratio}`;
  const color = videoCropInfoSingle.padding_color as Color;
  //middleBox.style.fill = `black`;
  middleBox.style.fill = `rgb(${color.r}, ${color.g}, ${color.b})`;

  middleBoxFrame.style.display = 'block';

  middleBoxFrame.setAttribute('x', `${renderInfo.x * ratio + leftWidth}`);
  middleBoxFrame.setAttribute('y', `${renderInfo.y * ratio + topHeight}`);
  middleBoxFrame.style.width = `${renderInfo.width * ratio}`;
  middleBoxFrame.style.height = `${renderInfo.height * ratio}`;
  videoSection.style.marginTop = `${5 - topHeight}px`;
}
/** Sets and displays side SVG elements as masking. */
function setSideSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  const cropInfo = videoCropInfoSingle.cropFromLocation as Rect;

  updateLeftWidth((cropInfo.x / videoInfo.width) * videoPreview.width + 5);
  updateTopHeight(
    Math.floor((cropInfo.y / videoInfo.height) * videoPreview.height + 5),
  );

  maskSide.style.display = 'block';
  maskMiddle.style.display = 'block';
  const ratio = videoResize.ratio;
  leftBox.style.width = `${leftWidth}px`;

  const rightX = renderInfo.width * ratio + leftWidth;
  const videoRightX = 5 + videoPreview.width;
  updateRightWidth(rightX < videoRightX ? videoRightX - rightX + 5 : 5);
  const rightBoxX = rightX < videoRightX ? rightX : videoRightX;

  rightBox.style.width = `${rightWidth}px`;
  topBox.style.width = `${rightBoxX + rightWidth}`;
  downBox.style.width = `${topBox.style.width}`;
  videoSection.style.width = `${rightX + rightWidth}`;

  rightBox.setAttribute('x', `${rightBoxX}`);
  rightBox.style.height = `${Math.floor(renderInfo.height * ratio)}`;
  leftBox.style.height = `${Math.floor(renderInfo.height * ratio)}`;
  rightBox.setAttribute('y', `${topHeight}`);
  leftBox.setAttribute('y', `${topHeight}`);

  topBox.style.height = `${topHeight}`;
  const downHeight =
    videoPreview.height - topHeight - renderInfo.height * ratio > 0
      ? videoPreview.height - topHeight - renderInfo.height * ratio + 10
      : topHeight;
  downBox.style.height = `${downHeight}`;
  downBox.setAttribute(
    'y',
    `${rightBox.getBoundingClientRect().height + topHeight}`,
  );

  videoPreview.style.left = `5px`;
  videoPreview.style.top = `5px`;
}

/** Scales and displays video element. */
function scaleVideo(videoCropInfoSingle: ExternalRenderingInformation): void {
  const cropInfo = videoCropInfoSingle.cropFromLocation as Rect;
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  const aspectRatio = renderInfo.width / renderInfo.height;
  const scaleRatio =
    cropInfo.width / aspectRatio > cropInfo.height
      ? renderInfo.width / cropInfo.width
      : renderInfo.height / cropInfo.height;
  const curWidth = videoResize.width * scaleRatio;
  const curHeight = videoResize.height * scaleRatio;
  videoPreview.width = curWidth;
  videoPreview.height = curHeight;
}

/** Renders the shot information in video control slider. */
export function renderShots(videoCropInfo: CropInfo): void {
  const shots: number[] = videoCropInfo.shots;
  for (let i = 0; i < shots.length; i++) {
    const shot: number = shots[i];
    const per: number = (shot / 1000000 / videoInfo.duration) * 100;
    const svg = d3.select('#main-video-play-slider');
    svg
      .append('rect')
      .attr('x', `${per}%`)
      .attr('y', 2)
      .attr('width', 4)
      .attr('height', 10)
      .attr('fill', '#DB4437');
    shotStorage.push(shot);
  }
}

/** Renders the face detection bounding boxes in video. */
export function renderFaceRegion(
  faceDetections: faceDetectRegion[],
  videoPreviewEle: HTMLVideoElement,
): void {
  const svg = d3.select('#detection-bounding-box-face');
  svg.selectAll('*').remove();

  if (faceDetections === undefined) {
    return;
  }
  for (let i = 0; i < faceDetections.length; i++) {
    const faceRect = faceDetections[i].faceRegion;
    let color: string = 'red';
    let width: string = '1';
    if (faceRect !== undefined) {
      if (faceDetections[i].signalType === 1) {
        color = 'red';
        width = '2';
      } else if (faceDetections[i].signalType === 2) {
        color = 'green';
        width = '1';
      } else {
        color = 'yellow';
        width = '0.5';
      }
      svg
        .append('rect')
        .attr(
          'x',
          `${faceRect.x * videoPreviewEle.width + videoPreviewEle.offsetLeft}`,
        )
        .attr(
          'y',
          `${faceRect.y * videoPreviewEle.height + videoPreviewEle.offsetTop}`,
        )
        .attr('width', `${faceRect.width * videoPreviewEle.width}`)
        .attr('height', `${faceRect.height * videoPreviewEle.height}`)
        .attr('stroke', color)
        .attr('stroke-width', width)
        //.attr('stroke-dasharray', '2')
        .attr('fill', 'transparent');
    }
  }
}

/** Renders the face detection bounding boxes in video. */
export function renderBorderRegion(
  borderDetections: BorderRegion[],
  videoPreviewEle: HTMLVideoElement,
): void {
  const svg = d3.select('#detection-bounding-box-border');
  svg.selectAll('*').remove();
  if (borderDetections === undefined) {
    return;
  }
  for (let i = 0; i < borderDetections.length; i++) {
    const border = borderDetections[i].border as Rect;
    if (border !== undefined) {
      const ratio = videoPreviewEle.width / border.width;
      svg
        .append('rect')
        .attr('x', `${border.x * ratio + videoPreviewEle.offsetLeft}`)
        .attr('y', `${border.y * ratio + videoPreviewEle.offsetTop}`)
        .attr('width', `${border.width * ratio}`)
        .attr('height', `${border.height * ratio}`)
        .attr('stroke', 'purple')
        .attr('stroke-width', 2)
        .attr('fill', 'transparent');
    }
  }
}

/**
 * Updates the ffmpeg progress bar according to count of decoded video sections.
 * @param n
 */
export function updateFFmpegBar(n: number): void {
  const progressBar = <HTMLDivElement>document.getElementById('myBar-ffmpeg');
  const processText = <HTMLSpanElement>(
    document.getElementById('process-bar-text-ffmpeg')
  );
  processText.innerHTML = `${((n / numberOfSection) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / numberOfSection) * 100}%`;
}

/**
 * Updates the Autoflip progress bar according to count of finished video sections.
 * @param n
 */
export function updateAutoflipBar(n: number): void {
  console.log(`current count a = ${n}`);
  const progressBar = <HTMLDivElement>document.getElementById('myBar-autoflip');
  const processText = <HTMLSpanElement>(
    document.getElementById('process-bar-text-autoflip')
  );
  let width = convertDoubleToString(curAspectRatio.inputWidth);
  let height = convertDoubleToString(curAspectRatio.inputHeight);
  const span = <HTMLSpanElement>(
    document.getElementById(`span-${width}-${height}`)
  );
  const totalFrameNumber = Math.floor(videoInfo.duration * 15) + 1;
  processText.innerHTML = `${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  span.innerHTML = ` ${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / totalFrameNumber) * 100}%`;
}

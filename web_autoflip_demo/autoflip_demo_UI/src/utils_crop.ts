import {
  videoPreview,
  curAspectRatio,
  videoInfo,
  videoResize,
  handlerStorage,
  cropWindowStorage,
  sectionIndexStorage,
  countAutoflip,
  updateCountAutoflip,
  timestampHeadMs,
  curFaceDetection,
  updateCurFaceDetection,
  middleBox,
  rightBox,
  leftBox,
  leftWidth,
  topDownHeight,
  middleBoxFrame,
  videoSection,
  maskSide,
  maskMiddle,
  rightWidth,
  isMasked,
  topBox,
  downBox,
  shotStorage,
  updateLeftWidth,
  updateRightWidth,
  updateTopDownHeight,
  sectionNumber,
  updateTimeRender,
} from './globals';

import { putMiddle } from './centerContent';
import { changeAspect } from './changeAspectRatio';
import * as d3 from 'd3';

/** Displays cropped window of the video. */
export function renderCroppedInfomation(videoCropInfo: CropInfo): void {
  const user = videoCropInfo.user;
  const cropInfo: ExternalRenderingInformation[] = videoCropInfo.cropWindows;
  const faceDetections: faceDetectRegion[][] = videoCropInfo.faceDetections;
  if (cropInfo.length === 0 && faceDetections.length === 0) {
    return;
  }
  const wrappedFunc = timeUpdateFunction.bind(
    videoPreview,
    cropInfo,
    faceDetections,
  );
  handlerStorage[
    `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
  ].push(wrappedFunc);
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
  console.log(`handler`, handlerStorage);
  console.log(`expected`, sectionIndexStorage);

  if (JSON.stringify(user) === JSON.stringify(curAspectRatio)) {
    videoPreview.addEventListener('timeupdate', wrappedFunc);
  }
}

const timeUpdateFunction = function handleTimeUpdate(
  cropInfo: ExternalRenderingInformation[],
  faceDetections: faceDetectRegion[][],
): void {
  for (let i = 0; i < cropInfo.length; i++) {
    if (
      videoPreview.currentTime >
      <number>cropInfo[i].timestampUS / 1000000 + timestampHeadMs
    ) {
      scaleVideo(cropInfo[i]);
      setSideSVG(cropInfo[i]);
      setRenderSVG(cropInfo[i]);
      putMiddle();
      renderFaceRegion(curFaceDetection);
    }
  }
  for (let i = 0; i < faceDetections.length; i++) {
    if (
      videoPreview.currentTime >
      <number>faceDetections[i][0].timestamp / 1000000 + timestampHeadMs
    ) {
      updateCurFaceDetection(faceDetections[i]);
      renderFaceRegion(faceDetections[i]);
    }
  }
};

/** Sets and displays middle SVG element as backgroud. */
function setRenderSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  //middleBox.style.display = 'block';
  const ratio = videoResize.ratio;

  middleBox.setAttribute('x', `${renderInfo.x * ratio + leftWidth} `);
  middleBox.setAttribute('y', `${renderInfo.y * ratio + topDownHeight}`);
  middleBox.style.width = `${renderInfo.width * ratio}`;
  middleBox.style.height = `${renderInfo.height * ratio}`;
  const color = videoCropInfoSingle.padding_color as Color;
  //middleBox.style.fill = `black`;
  middleBox.style.fill = `rgb(${color.r}, ${color.g}, ${color.b})`;

  middleBoxFrame.style.display = 'block';

  middleBoxFrame.setAttribute('x', `${renderInfo.x * ratio + leftWidth}`);
  middleBoxFrame.setAttribute('y', `${renderInfo.y * ratio + topDownHeight}`);
  middleBoxFrame.style.width = `${renderInfo.width * ratio}`;
  middleBoxFrame.style.height = `${renderInfo.height * ratio}`;
  videoSection.style.marginTop = `${5 - topDownHeight}px`;
}
/** Sets and displays side SVG elements as masking. */
function setSideSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  const cropInfo = videoCropInfoSingle.cropFromLocation as Rect;

  updateLeftWidth((cropInfo.x / videoInfo.width) * videoPreview.width + 5);
  updateTopDownHeight(
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

  if (rightX > videoRightX && isMasked) {
    rightBox.style.visibility = 'hidden';
  } else {
    rightBox.style.visibility = 'visible';
  }

  rightBox.style.width = `${rightWidth}px`;
  topBox.style.width = `${rightBoxX + rightWidth}`;
  downBox.style.width = `${topBox.style.width}`;
  videoSection.style.width = `${rightX + rightWidth}`;

  rightBox.setAttribute('x', `${rightBoxX}`);
  rightBox.style.height = `${Math.floor(renderInfo.height * ratio)}`;
  leftBox.style.height = `${Math.floor(renderInfo.height * ratio)}`;
  rightBox.setAttribute('y', `${topDownHeight}`);
  leftBox.setAttribute('y', `${topDownHeight}`);

  topBox.style.height = `${topDownHeight}`;
  const downHeight =
    videoPreview.height - topDownHeight - renderInfo.height * ratio > 0
      ? videoPreview.height - topDownHeight - renderInfo.height * ratio + 10
      : topDownHeight;
  downBox.style.height = `${downHeight}`;
  downBox.setAttribute(
    'y',
    `${rightBox.getBoundingClientRect().height + topDownHeight}`,
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
function renderFaceRegion(faceDetections: faceDetectRegion[]): void {
  const svg = d3.select('#detection-bounding-box');
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
          `${faceRect.x * videoPreview.width + videoPreview.offsetLeft}`,
        )
        .attr(
          'y',
          `${faceRect.y * videoPreview.height + videoPreview.offsetTop}`,
        )
        .attr('width', `${faceRect.width * videoPreview.width}`)
        .attr('height', `${faceRect.height * videoPreview.height}`)
        .attr('stroke', color)
        .attr('stroke-width', width)
        //.attr('stroke-dasharray', '2')
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
  processText.innerHTML = `${((n / sectionNumber) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / sectionNumber) * 100}%`;
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
  const span = <HTMLSpanElement>(
    document.getElementById(
      `${curAspectRatio.inputWidth}-${curAspectRatio.inputHeight}`,
    )
  );
  const totalFrameNumber = Math.floor(videoInfo.duration * 15) + 1;
  processText.innerHTML = `${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  span.innerHTML = ` ${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / totalFrameNumber) * 100}%`;
}

/** Adds crop history button in crop log section */
export function addHistoryButton(): void {
  d3.select('#history')
    .append('button')
    .attr('type', 'button')
    .style('display', 'block')
    .style('margin', '3px auto')
    .style('cursor', 'pointer')
    .text(`${curAspectRatio.inputWidth} : ${curAspectRatio.inputHeight}`)
    .on('click', function () {
      console.log(`text is`, d3.select(this).text());
      const split: string[] = d3.select(this).text().split(' ');
      changeAspect(Number(split[2]), Number(split[0]));
    })
    .append('span')
    .attr('id', `${curAspectRatio.inputWidth}-${curAspectRatio.inputHeight}`)
    .style('margin-left', '20px')
    .text(' 0%');

  d3.select('#history')
    .append('button')
    .attr('type', 'button')
    .attr(
      'id',
      `download-${curAspectRatio.inputWidth}-${curAspectRatio.inputHeight}`,
    )
    .attr('disabled', 'disabled')
    .style('display', 'block')
    .style('margin', '3px auto')
    .style('cursor', 'pointer')
    .text(`download`);
}

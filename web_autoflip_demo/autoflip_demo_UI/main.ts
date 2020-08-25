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

// Open and sets the indexedDB properties.
let db: IDBDatabase;
let request = indexedDB.open('auto-flip', 1);
request.onerror = (event: Event): void => {
  console.error('MAIN: Failed to load indexeddb');
  throw new Error(String(event));
};
request.onsuccess = (event: Event): void => {
  db = (event.target as IDBOpenDBRequest).result;
  console.log(`MAIN: success`);
  const transaction = db.transaction(['decodedFrames'], 'readwrite');
  const objectStore = transaction.objectStore('decodedFrames');
  objectStore.clear();
  console.log(`MAIN: database clear!`);
};
request.onupgradeneeded = function (event: Event): void {
  const db = (event.target as IDBOpenDBRequest).result;
  console.log(`MAIN: upgrade`);
  if (!db.objectStoreNames.contains('decodedFrames')) {
    console.log(`MAIN: database created!`);
    db.createObjectStore('decodedFrames', { keyPath: 'frameId' });
  }
};

// Creates fixed workers (ffmpeg: 4, autoflip: 1).
const ffmpegWorkers: Worker[] = [
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
  new Worker('ffmpeg_worker.js'),
];

const autoflipWorker: Worker = new Worker('autoflip_worker.js');
const ffmpegWorkerAudio = new Worker('ffmpeg_worker_audio.js');
const ffmpegWorkerCombine = new Worker('ffmpeg_worker_combine.js');

const processWindow = 2;
let videoBuffer: ArrayBuffer;
let videoInfo: VideoInfo;
let size: number = 0;
let videoFile: File;
let videoResize: Resize;
let shotArray: number[] = [];
let userInput = { inputWidth: 1, inputHeight: 1 };
let frameIdTill: number = 0;
let cyclesCropWindows: any = {};
let handlers: any = {};
let expected: any = {};
let resultVideos: any = {};
let autoflipFree: boolean = true;
let countf: number = 0;
let counta: number = 0;
let finished: boolean[] = [];
let leftWidth: number = 250;
let rightWidth: number = 250;
let topDownHeight: number = 50;
let timestampHeadMs: number = 0;
let isMasked: boolean = false;
let curFaceDetection: faceDetectRegion[];
let audio: ArrayBuffer;

const video = <HTMLVideoElement>document.querySelector('#video-display');
const videoPlay = <HTMLVideoElement>document.getElementById('video-play');
const card1 = <HTMLDivElement>document.querySelector('#card1');
const card2 = <HTMLDivElement>document.querySelector('#card2');
const card3 = <HTMLDivElement>document.querySelector('#card3');
const card4 = <HTMLDivElement>document.querySelector('#card4');
const card31 = <HTMLDivElement>document.querySelector('#card31');
const logHistory = <HTMLDivElement>document.querySelector('#history');
const videoSection = <HTMLDivElement>document.querySelector('#video-section');
const topBox = <SVGRectElement>document.querySelector('#topBox');
const middleBox = <SVGRectElement>document.querySelector('#middleBox');
const middleBoxFrame = <SVGRectElement>(
  document.querySelector('#middleBoxFrame')
);
const leftBox = <SVGRectElement>document.querySelector('#leftBox');
const rightBox = <SVGRectElement>document.querySelector('#rightBox');
const downBox = <SVGRectElement>document.querySelector('#downBox');
const maskSide = <SVGSVGElement>document.querySelector('#mask-side');
const maskMiddle = <SVGRectElement>document.querySelector('#mask-middle');
const detectionBoundingBox = <SVGSVGElement>(
  document.querySelector('#detection-bounding-box')
);
const canvas: any = document.getElementById('canvas');
const timerDisplay = <HTMLSpanElement>(
  document.getElementById('safeTimerDisplay')
);

// Adds event to html element.
const inputVideo = <HTMLInputElement>document.querySelector('#video-upload');
const aspectWidth = <HTMLInputElement>document.querySelector('#aspect-weight');
const aspectHeight = <HTMLInputElement>document.querySelector('#aspect-height');
inputVideo.onchange = handleOnChange;
const demoButton = <HTMLButtonElement>document.querySelector('#start-demo');
demoButton.onclick = startDemo;
const shotButton = <HTMLLIElement>document.querySelector('#shot-button');
shotButton.onclick = nextShot;
const dropArea = <HTMLDivElement>document.querySelector('.zone');
dropArea.addEventListener('drop', dropHandler);
dropArea.addEventListener('dragover', dragOverHandler);
dropArea.addEventListener('dragleave', dragLeaveHandler);
const maskButton = <HTMLLIElement>document.querySelector('#mask-button');
maskButton.onclick = maskVideo;
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

function changeAspect(changeInputHeight: number, changeInputWidth: number) {
  const preHandlers =
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`];
  console.log(`The user input is`, changeInputHeight, changeInputWidth);

  userInput.inputWidth = changeInputWidth;
  userInput.inputHeight = changeInputHeight;
  for (let i = 0; i < preHandlers.length; i++) {
    video.removeEventListener('timeupdate', preHandlers[i]);
  }
  //const transaction = db.transaction(['decodedFrames'], 'readwrite');
  //const objectStore = transaction.objectStore('decodedFrames');
  //objectStore.clear();
  //console.log(`MAIN: database clear!`);
  console.log(`check if exist!`);
  if (
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] === undefined
  ) {
    console.log(`notexsit!`);
    addHistoryButton();
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] = 0;
  }
  const expect = expected[`${userInput.inputHeight}&${userInput.inputWidth}`];
  const windows =
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`];
  const curVideoId = Math.floor(windows.length / 30);
  counta = windows.length;
  updateAutoflipBar(counta);

  const handlersCurrent =
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`];
  for (let i = 0; i < handlersCurrent.length; i++) {
    video.addEventListener('timeupdate', handlersCurrent[i]);
  }
  if (size === Math.ceil(windows.length / 30)) {
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
      end: curVideoId === size - 1,
      user: userInput,
    });
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] =
      Math.floor(windows.length / 30) + 1;
  }
}

// Centers the video element when page load.
putMiddle();

/** Moves the time of the video to the next shot position. */
function nextShot(): void {
  const videoPerview = <HTMLVideoElement>(
    document.querySelector('#video-display')
  );
  const time: number = videoPerview.currentTime;
  for (let i = 0; i < shotArray.length; i++) {
    if (shotArray[i] / 1000000 > time) {
      videoPerview.currentTime = shotArray[i] / 1000000;
      return;
    }
  }
  videoPerview.currentTime = shotArray[0];
}

/** Uploads a pre-stored demo video as input. */
function startDemo(): void {
  const getFileBlob = function (url: string, cb: Function): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function (): void {
      cb(xhr.response);
    });
    xhr.send();
  };
  const blobToFile = function (blob: File, name: string): File {
    return blob;
  };
  const getFileObject = function (filePathOrUrl: string, cb: Function): void {
    getFileBlob(filePathOrUrl, function (blob: File) {
      cb(blobToFile(blob, 'movie.mp4'));
    });
  };
  getFileObject('./movie.mp4', function (fileObject: File): void {
    videoFile = fileObject;
    handleOnChange(<Event>event);
  });
}

/**
 * The drop event handler for the file drag and drop section.
 * @param ev
 */
function dropHandler(ev: DragEvent): void {
  dropArea.style.background = 'transparent';
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  if (ev.dataTransfer !== null && ev.dataTransfer.items[0].kind === 'file') {
    const file = ev.dataTransfer.items[0].getAsFile() as File;
    videoFile = file;
    handleOnChange(ev);
  }
}
/**
 * The dropover event handler for the file drag and drop section.
 * @param ev
 */
function dragOverHandler(ev: Event): void {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  dropArea.style.background = '#4285F4';
}
/**
 * The dropleave event handler for the file drag and drop section.
 * @param ev
 */
function dragLeaveHandler(ev: Event): void {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  dropArea.style.background = 'transparent';
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
    isMasked = false;
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
    isMasked = true;
  }
}

/** Centers video section indludes video and SVG masking elements. */
function putMiddle(): void {
  let left =
    (card31.offsetWidth - middleBox.getBoundingClientRect().width) / 2 -
    leftWidth;
  let top =
    (330 - middleBox.getBoundingClientRect().height) / 2 - topDownHeight;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card31.offsetWidth - video.offsetWidth) / 2;
    videoSection.style.width = `100%`;
    top = (330 - video.height) / 2;
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
$(window).resize((): void => {
  let left =
    (card31.offsetWidth - middleBox.getBoundingClientRect().width) / 2 -
    leftWidth;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card31.offsetWidth - video.offsetWidth) / 2;
    videoSection.style.width = `100%`;
  } else {
    if (left < 0) {
      left = 0;
    }
  }
  videoSection.style.marginLeft = `${left}px`;
});

/** Handles onChange event of input video element. */
function handleOnChange(event: Event): void {
  let promise = new Promise(function (resolve: any): void {
    if (videoFile === undefined) {
      let input = <HTMLInputElement>event.target;
      if (!input.files || !input.files[0]) return;
      videoFile = input.files[0];
    }
    console.log(`MAIN: video file has been chosen`, videoFile);

    const videoURL = URL.createObjectURL(videoFile);
    video.src = videoURL;
    videoPlay.src = videoURL;
    video.preload = 'metadata';
    video.onloadedmetadata = function (): void {
      videoInfo = {
        duration: video.duration,
        height: video.videoHeight,
        width: video.videoWidth,
      };
      const ratio = video.width / video.videoWidth;
      video.height = ratio * video.videoHeight;
      videoResize = {
        width: video.width,
        height: video.height,
        x: video.offsetLeft,
        y: video.offsetTop,
        ratio: ratio,
      };
      console.log(`video info`, videoInfo, videoResize);
      console.log(`MAIN: get video infomation`, videoInfo);
      size = Math.floor(video.duration / processWindow) + 1;
      console.log(`MAIN: this is the size of sections ${size}`);

      // Creates file reader to read video file as an array buffer
      const reader = new FileReader();
      reader.readAsArrayBuffer(videoFile);
      reader.onload = function (): void {
        videoBuffer = reader.result as ArrayBuffer;
        console.log(`MAIN: video converted to array buffer`, videoBuffer);
        for (let i = 0; i < ffmpegWorkers.length; i++) {
          ffmpegWorkers[i].postMessage({
            type: 'videoData',
            video: videoBuffer,
            workerId: i,
          });
        }
        getAudioOfVideo();
        resolve('success');
      };
    };
  });
  promise.then((): void => {
    // Makes card1 invisiable, card3 display.
    card1.style.display = 'none';
    card3.style.display = 'flex';
    putMiddle();
    startWorker();
  });
}

/** Adds crop history button in crop log section */
function addHistoryButton(): void {
  d3.select('#history')
    .append('button')
    .attr('type', 'button')
    .style('display', 'block')
    .style('margin', '3px auto')
    .style('cursor', 'pointer')
    .text(`${userInput.inputWidth} : ${userInput.inputHeight}`)
    .on('click', function () {
      console.log(`text is`, d3.select(this).text());
      const split: string[] = d3.select(this).text().split(' ');
      changeAspect(Number(split[2]), Number(split[0]));
    })
    .append('span')
    .attr('id', `${userInput.inputWidth}-${userInput.inputHeight}`)
    .style('margin-left', '20px')
    .text(' 0%');

  d3.select('#history')
    .append('button')
    .attr('type', 'button')
    .attr('id', `download-${userInput.inputWidth}-${userInput.inputHeight}`)
    .attr('disabled', 'disabled')
    .style('display', 'block')
    .style('margin', '3px auto')
    .style('cursor', 'pointer')
    .text(`download`);
}

/** Starts workers to process ffmpeg and autoflip */
function startWorker(): void {
  // Reads the user inputs for aspect ratio;
  const inputHeight = aspectHeight.value;
  const inputWidth = aspectWidth.value;
  console.log(`The user input is`, inputHeight, inputWidth);
  userInput.inputWidth = Number(inputWidth);
  userInput.inputHeight = Number(inputHeight);
  addHistoryButton();
  let finished: boolean[] = [];
  for (let i = 0; i < size; i++) {
    finished[i] = false;
  }
  cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
  handlers[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
  expected[`${userInput.inputHeight}&${userInput.inputWidth}`] = 0;

  console.log(`MAIN: workers started!`);
  for (let i = 0; i < ffmpegWorkers.length; i++) {
    console.log(`MAIN: PROCESS: send the video (${i}) to worker ${i}`);
    ffmpegWorkers[i].postMessage({
      videoId: i,
      workerId: i,
      startTime: i * processWindow,
      startId: i * 30,
      workWindow: processWindow,
      user: userInput,
    });

    ffmpegWorkers[i].onmessage = function (e: MessageEvent): void {
      finished[e.data.videoId] = true;
      countf++;
      updateFFmpegBar(countf);

      if (JSON.stringify(e.data.user) === JSON.stringify(userInput)) {
        console.log(`the video(${e.data.videoId}) is continue!`);
        if (e.data.videoId === 0) {
          autoflipWorker.postMessage({
            type: 'firstCrop',
            videoId: 0,
            startTime: 0,
            startId: 0,
            width: videoInfo.width,
            height: videoInfo.height,
            window: processWindow,
            end: e.data.videoId === size - 1,
            user: userInput,
          });
          autoflipFree = false;
          expected[`${userInput.inputHeight}&${userInput.inputWidth}`]++;
        }
        const expect =
          expected[`${userInput.inputHeight}&${userInput.inputWidth}`];
        if (finished[expect] === true && autoflipFree === true) {
          autoflipWorker.postMessage({
            type: 'nextCropStore',
            videoId: expect,
            startTime: expect * processWindow,
            startId: expect * 30,
            width: videoInfo.width,
            height: videoInfo.height,
            end: expect === size - 1,
            user: userInput,
          });
          autoflipFree = false;
          expected[`${userInput.inputHeight}&${userInput.inputWidth}`]++;
        }
      }

      if (e.data.videoId + ffmpegWorkers.length < size) {
        let nextVideo = e.data.videoId + ffmpegWorkers.length;
        ffmpegWorkers[e.data.workerId].postMessage({
          videoId: nextVideo,
          workerId: e.data.workerId,
          startTime: nextVideo * processWindow,
          startId: nextVideo * 30,
          workWindow: processWindow,
          user: userInput,
        });
      }
    };
  }

  /** Renders video once got the result from autoflip. */
  autoflipWorker.onmessage = function (e: MessageEvent): void {
    if (JSON.stringify(e.data.user) !== JSON.stringify(userInput)) {
      return;
    }
    console.log(`MAIN: analysis received from autoflip`, e.data);
    // Applys the cropInfo to current display video.
    console.log(`MAIN: render the recevied video crop windows`);
    renderCroppedInfomation(e.data);
    console.log(`MAIN: render the recevied shots`);
    renderShots(e.data);

    if (e.data.type !== 'finishedAnalysis') {
      console.log(`request next`);
      const expect =
        expected[`${userInput.inputHeight}&${userInput.inputWidth}`];

      console.log(`finished`, finished);
      if (finished[expect] === true) {
        autoflipWorker.postMessage({
          type: 'nextCropFind',
          videoId: expect,
          startTime: expect * processWindow,
          startId: expect * 30,
          end: expect === size - 1,
          user: userInput,
        });
        expected[`${userInput.inputHeight}&${userInput.inputWidth}`]++;
      } else {
        autoflipFree = true;
      }
    } else {
      const downloadButton = <HTMLButtonElement>(
        document.querySelector(
          `#download-${userInput.inputWidth}-${userInput.inputHeight}`,
        )
      );

      const wrapFunctionCreateDownload = createDownload.bind(
        e,
        userInput.inputWidth,
        userInput.inputHeight,
      );
      downloadButton.onclick = wrapFunctionCreateDownload;

      downloadButton.disabled = false;
    }
  };
}

// Limites the video playing part to the section finished.
let timeRender: number = video.duration;
video.addEventListener('timeupdate', function (): void {
  if (video.currentTime > timeRender) {
    video.currentTime = 0;
  }
});

/** Displays cropped window of the video. */
function renderCroppedInfomation(videoCropInfo: CropInfo): void {
  const user = videoCropInfo.user;
  const cropInfo: ExternalRenderingInformation[] = videoCropInfo.cropWindows;
  const faceDetections: faceDetectRegion[][] = videoCropInfo.faceDetections;
  if (cropInfo.length === 0 && faceDetections.length === 0) {
    return;
  }
  const wrappedFunc = timeUpdateFunction.bind(video, cropInfo, faceDetections);
  handlers[`${userInput.inputHeight}&${userInput.inputWidth}`].push(
    wrappedFunc,
  );
  if (cropInfo.length !== 0) {
    timeRender = <number>cropInfo[cropInfo.length - 1].timestampUS / 1000000;
  }
  for (let i = 0; i < cropInfo.length; i++) {
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`].push(
      cropInfo[i],
    );
  }

  counta =
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`]
      .length;
  updateAutoflipBar(counta);
  console.log(`cycleWindows`, cyclesCropWindows);
  console.log(`handler`, handlers);
  console.log(`expected`, expected);

  if (JSON.stringify(user) === JSON.stringify(userInput)) {
    video.addEventListener('timeupdate', wrappedFunc);
  }
}

const timeUpdateFunction = function handleTimeUpdate(
  cropInfo: ExternalRenderingInformation[],
  faceDetections: faceDetectRegion[][],
): void {
  for (let i = 0; i < cropInfo.length; i++) {
    if (
      video.currentTime >
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
      video.currentTime >
      <number>faceDetections[i][0].timestamp / 1000000 + timestampHeadMs
    ) {
      curFaceDetection = faceDetections[i];
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

  leftWidth = (cropInfo.x / videoInfo.width) * video.width + 5;
  topDownHeight = Math.floor(
    (cropInfo.y / videoInfo.height) * video.height + 5,
  );

  maskSide.style.display = 'block';
  maskMiddle.style.display = 'block';
  const ratio = videoResize.ratio;
  leftBox.style.width = `${leftWidth}px`;

  const rightX = renderInfo.width * ratio + leftWidth;
  const videoRightX = 5 + video.width;
  rightWidth = rightX < videoRightX ? videoRightX - rightX + 5 : 5;
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
    video.height - topDownHeight - renderInfo.height * ratio > 0
      ? video.height - topDownHeight - renderInfo.height * ratio + 10
      : topDownHeight;
  downBox.style.height = `${downHeight}`;
  downBox.setAttribute(
    'y',
    `${rightBox.getBoundingClientRect().height + topDownHeight}`,
  );

  video.style.left = `5px`;
  video.style.top = `5px`;
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
  video.width = curWidth;
  video.height = curHeight;
}

/** Renders the shot information in video control slider. */
function renderShots(videoCropInfo: CropInfo): void {
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
    shotArray.push(shot);
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
        .attr('x', `${faceRect.x * video.width + video.offsetLeft}`)
        .attr('y', `${faceRect.y * video.height + video.offsetTop}`)
        .attr('width', `${faceRect.width * video.width}`)
        .attr('height', `${faceRect.height * video.height}`)
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
function updateFFmpegBar(n: number): void {
  const progressBar = <HTMLDivElement>document.getElementById('myBar-ffmpeg');
  const processText = <HTMLSpanElement>(
    document.getElementById('process-bar-text-ffmpeg')
  );
  processText.innerHTML = `${((n / size) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / size) * 100}%`;
}

/**
 * Updates the Autoflip progress bar according to count of finished video sections.
 * @param n
 */
function updateAutoflipBar(n: number): void {
  console.log(`current count a = ${n}`);
  const progressBar = <HTMLDivElement>document.getElementById('myBar-autoflip');
  const processText = <HTMLSpanElement>(
    document.getElementById('process-bar-text-autoflip')
  );
  const span = <HTMLSpanElement>(
    document.getElementById(`${userInput.inputWidth}-${userInput.inputHeight}`)
  );
  const totalFrameNumber = Math.floor(videoInfo.duration * 15);
  processText.innerHTML = `${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  span.innerHTML = ` ${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / totalFrameNumber) * 100}%`;
}

function createDownload(inputWidth: number, inputHeight: number): void {
  // Puases the main preview video player to ensure recording quality
  video.pause();
  const canvas2D = canvas.getContext('2d') as CanvasRenderingContext2D;

  const cropWindows: ExternalRenderingInformation[] =
    cyclesCropWindows[`${inputHeight}&${inputWidth}`];
  const render = cropWindows[0].renderToLocation as Rect;
  canvas.width = render.width;
  canvas.height = render.height;

  let videoCropX = 0;
  let videoCropY = 0;
  let videoCropWidth = 1920;
  let videoCropHeight = 1080;
  let mediaRecorder: MediaRecorder;
  let recordedBlobs: Blob[];
  let output: ArrayBuffer;
  let stream: any;

  video.currentTime = 0;
  videoPlay.play();
  startRecording();
  loop();

  function loop() {
    canvas2D.imageSmoothingEnabled = false;
    if (!videoPlay.paused && !videoPlay.ended) {
      canvas2D.drawImage(
        videoPlay,
        videoCropX,
        videoCropY,
        videoCropWidth,
        videoCropHeight,
        0,
        0,
        render.width,
        render.height,
      );
      stream.getVideoTracks()[0].requestFrame();
      setTimeout(loop, 35);
    } else {
      stopRecording();
    }
  }

  function handleDataAvailable(event: BlobEvent): void {
    if (event.data && event.data.size > 0) {
      console.log('data here');
      recordedBlobs.push(event.data);
    }
  }

  function handleStop(event: Event): void {
    console.log('Recorder stopped: ', event);
    const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
    generateVideo(superBuffer);
  }

  function startRecording(): void {
    videoPlay.play();
    stream = canvas.captureStream(0);
    console.log('Started stream capture from canvas element: ', stream);
    const options = { mimeType: 'video/webm;codecs=h264' };
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(); // collect 100ms of data
    console.log('MediaRecorder started', mediaRecorder);
    card3.style.display = 'none';
    card4.style.display = 'block';
    timer();
  }

  function stopRecording(): void {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
  }

  function download(inputWidth: number, inputHeight: number): void {
    const blob = new Blob([resultVideos[`${inputWidth}&${inputHeight}`]], {
      type: 'video/mp4',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.mp4';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  function generateVideo(blob: Blob): void {
    let muted: ArrayBuffer;

    // Creates file reader to read muted video file as an array buffer
    blob.arrayBuffer().then((buffer): void => {
      muted = buffer;
      console.log('AUDIO: Main thread post video to extrat audio');
      console.log('AUDIO: the webm', muted);
      ffmpegWorkerCombine.postMessage({
        type: 'combineVideo',
        audioVideo: audio,
        mutedVideo: muted,
      });
    });

    ffmpegWorkerCombine.onmessage = function (e: MessageEvent): void {
      output = e.data.data.buffers[0].data;
      console.log('MAIN: Combine: Main thread receive combined video', output);
      card3.style.display = 'flex';
      card4.style.display = 'none';
      resultVideos[`${inputWidth}&${inputHeight}`] = output;
      download(inputWidth, inputHeight);
      const downloadButton = <HTMLButtonElement>(
        document.querySelector(`#download-${inputWidth}-${inputHeight}`)
      );
      downloadButton.onclick = null;
      const wrapFunctionDownload = download.bind(e, inputWidth, inputHeight);
      downloadButton.addEventListener('click', wrapFunctionDownload);
    };
  }

  videoPlay.addEventListener('timeupdate', function (): void {
    for (let i = 0; i < cropWindows.length; i++) {
      let cropWindowForFrame = cropWindows[i].cropFromLocation as Rect;
      if (videoPlay.currentTime > i * (1 / 15)) {
        videoCropX = cropWindowForFrame.x;
        videoCropY = cropWindowForFrame.y;
        videoCropWidth = cropWindowForFrame.width;
        videoCropHeight = cropWindowForFrame.height;
      }
    }
  });
}

/** Converts the seconds to MM:SS string format. */
function time_format(seconds: number): string {
  const m: string =
    Math.floor(seconds / 60) < 10
      ? '0' + Math.floor(seconds / 60)
      : '' + Math.floor(seconds / 60);
  const s: string =
    Math.floor(seconds - Number(m) * 60) < 10
      ? '0' + Math.floor(seconds - Number(m) * 60)
      : '' + Math.floor(seconds - Number(m) * 60);
  return m + ':' + s;
}

function timer(): void {
  let sec = 0;
  const timer = setInterval(function (): void {
    timerDisplay.innerHTML = time_format(sec);
    sec++;
    if (card4.style.display === 'none') {
      clearInterval(timer);
    }
  }, 1000);
}

/** Extract the audio from the input video */
function getAudioOfVideo() {
  console.log('AUDIO: Main thread post video to extrat audio');
  ffmpegWorkerAudio.postMessage({
    type: 'videoData',
    video: videoBuffer,
  });

  ffmpegWorkerAudio.onmessage = function (e: MessageEvent): void {
    console.log('AUDIO: Main thread receive audio', e.data);
    if (e.data.data.buffers.length !== 0) {
      audio = e.data.data.buffers[0].data;
    }
  };
}

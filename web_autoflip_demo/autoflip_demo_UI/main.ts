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

/** The interface defines a cropping information object. */
interface CropInfo {
  /** The information type, like "finishedAnalysis", "sectionAnalysis". */
  type: string;
  /** The crop windows for processed frames. */
  cropWindows: ExternalRenderingInformation[];
  /** The shots positions for processed frames. */
  shots: number[];
  /** The first frame Id of the section. */
  startId: number;
  /** The sequence Id of the video. */
  videoId: number;
  user: { inputWidth: number; inputHeight: number };
  faceDetections: faceDetectRegion[];
}

/** The interface defines information for a resizing dimension. */
interface Resize {
  /** The width of the resized rectangle window. */
  width: number;
  /** The height of the resized rectangle window. */
  height: number;
  /** The x position (left) of the resized rectangle window.*/
  x: number;
  /** The y postion (top) of the resized rectangle window. */
  y: number;
  /** The resize ratio compared to original video dimension. */
  ratio: number;
}

/** The interface defines a video information object. */
interface VideoInfo {
  /** The duration of the video. */
  duration: number;
  /** The width of the video dimension. */
  width: number;
  /** The height of the video dimension.*/
  height: number;
}

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
let autoflipFree: boolean = true;
let countf: number = 0;
let counta: number = 0;
let finished: boolean[] = [];
let leftWidth: number = 250;
let rightWidth: number = 250;
let topDownHeight: number = 50;
let timestampHeadMs: number = 0;
let isMasked: boolean = false;
let curFaceDetection: Rect | undefined;

const video = <HTMLVideoElement>document.querySelector('#video-display');
const card1 = <HTMLDivElement>document.querySelector('#card1');
const card2 = <HTMLDivElement>document.querySelector('#card2');
const card3 = <HTMLDivElement>document.querySelector('#card3');
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
        resolve('success');
      };
    };
  });
  promise.then((): void => {
    // Makes card1 invisiable, card2 and card3 display.
    card1.style.display = 'none';
    //card2.style.display = 'block';
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
        if (e.data.videoId === expect && autoflipFree === true) {
          autoflipWorker.postMessage({
            type: 'nextCropStore',
            videoId: expect,
            startTime: expect * processWindow,
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
    if (e.data.type === 'finishedAnalysis') {
      console.log(
        `MAIN: all frames received from worker ${e.data.workerId}`,
        e.data,
      );
      // Applys the cropInfo to current display video.
      console.log(`MAIN: render the recevied video crop windows`);
      renderCroppedVideo(e.data);
      console.log(`MAIN: render the recevied shots`);
      renderShots(e.data);
    } else {
      console.log(`MAIN: part result received`, e.data);
      if (e.data.cropWindows) {
        // Applys the cropInfo to current display video.
        console.log(`MAIN: render the recevied video crop windows`);
        renderCroppedVideo(e.data);
        console.log(`MAIN: render the recevied shots`);
        renderShots(e.data);
      }
      console.log(`request next`);
      const expect =
        expected[`${userInput.inputHeight}&${userInput.inputWidth}`];

      console.log(`finished`, finished);
      if (finished[expect] === true) {
        autoflipFree = true;
        autoflipWorker.postMessage({
          type: 'nextCropFind',
          videoId: expect,
          startTime: expect * processWindow,
          startId: expect * 30,
          end: expect === size - 1,
          user: userInput,
        });
        autoflipFree = false;
        expected[`${userInput.inputHeight}&${userInput.inputWidth}`]++;
      } else {
        console.log(`wait exptect`);
        autoflipWorker.postMessage({
          type: 'nextCropMiss',
          videoId: expect,
          startTime: expect * processWindow,
          startId: expect * 30,
          end: expect === size - 1,
          user: userInput,
        });
      }
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
function renderCroppedVideo(videoCropInfo: CropInfo): void {
  const user = videoCropInfo.user;
  const cropInfo: ExternalRenderingInformation[] = videoCropInfo.cropWindows;
  const faceDetections: faceDetectRegion[] = videoCropInfo.faceDetections;
  if (cropInfo.length === 0 && faceDetections.length === 0) {
    return;
  }
  const wrappedFunc = timeUpdateFunction.bind(video, cropInfo, faceDetections);
  handlers[`${userInput.inputHeight}&${userInput.inputWidth}`].push(
    wrappedFunc,
  );

  timeRender = <number>cropInfo[cropInfo.length - 1].timestampUS / 1000000;
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
  faceDetections: faceDetectRegion[],
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
      <number>faceDetections[i].timestamp / 1000000 + timestampHeadMs
    ) {
      curFaceDetection = faceDetections[i].faceRegion;
      renderFaceRegion(faceDetections[i].faceRegion);
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
function renderFaceRegion(faceRect: Rect | undefined): void {
  const svg = d3.select('#detection-bounding-box');
  svg.selectAll('*').remove();

  if (faceRect === undefined) {
    return;
  } else {
    svg
      .append('rect')
      .attr('x', `${faceRect.x * video.width + video.offsetLeft}`)
      .attr('y', `${faceRect.y * video.height + video.offsetTop}`)
      .attr('width', `${faceRect.width * video.width}`)
      .attr('height', `${faceRect.height * video.height}`)
      .attr('stroke', 'red')
      .attr('stroke-width', '2')
      .attr('fill', 'transparent');
  }
}

/** Remains the changed crop windows */
/*
function remainChanged(cropInfo, startId) {
  let remained = [];
  let pre = JSON.stringify(cropInfo[0]);
  cropInfo[0]['time'] = Number(((1 / 15) * startId).toFixed(3));
  remained.push(cropInfo[0]);
  for (let i = 1; i < cropInfo.length; i++) {
    if (pre !== JSON.stringify(cropInfo[i])) {
      pre = JSON.stringify(cropInfo[i]);
      cropInfo[i]['time'] = Number(((1 / 15) * (i + startId)).toFixed(3));
      remained.push(cropInfo[i]);
    }
  }
  return remained;
}
*/

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

  const totalFrameNumber = Math.ceil(videoInfo.duration * 15);
  processText.innerHTML = `${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  span.innerHTML = ` ${((n / totalFrameNumber) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / totalFrameNumber) * 100}%`;
}

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
let userInput = { inputWidth: 0, inputHeight: 0 };
const video = <HTMLVideoElement>document.querySelector('#video-display');
const card1 = <HTMLDivElement>document.querySelector('#card1');
const card2 = <HTMLDivElement>document.querySelector('#card2');
const card3 = <HTMLDivElement>document.querySelector('#card3');
const videoSection = <HTMLDivElement>document.querySelector('#video-section');
const topBox = <SVGRectElement>document.querySelector('#topBox');
const middleBox = <SVGRectElement>document.querySelector('#middleBox');
const leftBox = <SVGRectElement>document.querySelector('#leftBox');
const rightBox = <SVGRectElement>document.querySelector('#rightBox');
const downBox = <SVGRectElement>document.querySelector('#downBox');
const maskSide = <SVGSVGElement>document.querySelector('#mask-side');
const maskMiddle = <SVGRectElement>document.querySelector('#mask-middle');

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
  dropArea.style.background = '#4caf50';
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
    leftBox.setAttribute('stroke-width', '2');
    rightBox.setAttribute('stroke-width', '2');
    downBox.setAttribute('stroke-width', '2');
    topBox.setAttribute('stroke-width', '2');
    //middleBox.style.border = 'none';
  } else {
    maskButton.innerHTML = 'Show Original';
    leftBox.style.fill = 'white';
    rightBox.style.fill = 'white';
    downBox.style.fill = 'white';
    topBox.style.fill = 'white';
    leftBox.setAttribute('stroke-width', '0');
    rightBox.setAttribute('stroke-width', '0');
    downBox.setAttribute('stroke-width', '0');
    topBox.setAttribute('stroke-width', '0');
    leftBox.setAttribute('fill-opacity', '100%');
    rightBox.setAttribute('fill-opacity', '100%');
    downBox.setAttribute('fill-opacity', '100%');
    topBox.setAttribute('fill-opacity', '100%');
    //middleBox.style.border = '5px solid red';
  }
}

/** Centers video section indludes video and SVG masking elements. */
function putMiddle(): void {
  let left = (card3.offsetWidth - topBox.getBoundingClientRect().width) / 2;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card3.offsetWidth - video.offsetWidth) / 2;
  } else if (left < 0) {
    left = 0;
  }
  videoSection.style.marginLeft = `${left}px`;
}

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

      // Reads the user inputs for aspect ratio;
      const inputHeight = aspectHeight.value;
      const inputWidth = aspectWidth.value;
      console.log(`The user input is`, inputHeight, inputWidth);
      userInput.inputWidth = Number(inputWidth);
      userInput.inputHeight = Number(inputHeight);

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
    card2.style.display = 'block';
    card3.style.display = 'block';
    putMiddle();
    startWorker();
  });
}

/** Starts workers to process ffmpeg and autoflip */
function startWorker(): void {
  let expected: number = 0;
  let autoflipFree: boolean = true;
  let countf: number = 0;
  let counta: number = 0;

  let finished: boolean[] = [];
  for (let i = 0; i < size; i++) {
    finished[i] = false;
  }

  console.log(`MAIN: workers started!`);
  for (let i = 0; i < ffmpegWorkers.length; i++) {
    console.log(`MAIN: PROCESS: send the video (${i}) to worker ${i}`);
    ffmpegWorkers[i].postMessage({
      videoId: i,
      workerId: i,
      startTime: i * processWindow,
      workWindow: processWindow,
    });

    ffmpegWorkers[i].onmessage = function (e: MessageEvent): void {
      finished[e.data.videoId] = true;
      countf++;
      updateFFmpegBar(countf);

      if (e.data.videoId === 0) {
        autoflipWorker.postMessage({
          type: 'firstCrop',
          videoId: 0,
          startTime: 0,
          width: videoInfo.width,
          height: videoInfo.height,
          window: processWindow,
          end: e.data.videoId === size - 1,
          user: userInput,
        });
        autoflipFree = false;
        expected++;
      }

      if (e.data.videoId === expected && autoflipFree === true) {
        autoflipWorker.postMessage({
          type: 'nextCropStore',
          videoId: expected,
          startTime: expected * processWindow,
          width: videoInfo.width,
          height: videoInfo.height,
          end: expected === size - 1,
        });
        autoflipFree = false;
        expected++;
      }

      if (e.data.videoId + ffmpegWorkers.length < size) {
        let nextVideo = e.data.videoId + ffmpegWorkers.length;
        ffmpegWorkers[e.data.workerId].postMessage({
          videoId: nextVideo,
          workerId: e.data.workerId,
          startTime: nextVideo * processWindow,
          workWindow: processWindow,
        });
      }
    };
  }

  /** Renders video once got the result from autoflip. */
  autoflipWorker.onmessage = function (e: MessageEvent): void {
    if (e.data.type === 'finishedAnalysis') {
      counta++;
      updateAutoflipBar(counta);
      console.log(
        `MAIN: all frames received from worker ${e.data.workerId}`,
        e.data,
      );
      // Applys the cropInfo to current display video.
      console.log(`MAIN: render the recevied video crop windows`);
      renderCroppedVideo(e.data);
      console.log(`MAIN: render the recevied shots`);
      renderShots(e.data);
    } else if (e.data.type === 'currentAnalysis') {
      console.log(
        `MAIN: part frames received from worker ${e.data.workerId}`,
        e.data,
      );
      // Applys the cropInfo to current display video.
      console.log(`MAIN: render the recevied video crop windows`);
      renderCroppedVideo(e.data);
      console.log(`MAIN: render the recevied shots`);
      renderShots(e.data);
    } else {
      counta++;
      updateAutoflipBar(counta);
      autoflipFree = true;
      if (finished[expected] === true) {
        autoflipWorker.postMessage({
          type: 'nextCropFind',
          videoId: expected,
          startTime: expected * processWindow,
          end: expected === size - 1,
        });
        autoflipFree = false;
        expected++;
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
  const cropInfo: ExternalRenderingInformation[] = videoCropInfo.cropWindows;
  video.addEventListener('timeupdate', function (): void {
    for (let i = 0; i < cropInfo.length; i++) {
      if (this.currentTime > <number>cropInfo[i].timestampUS / 1000000) {
        scaleVideo(cropInfo[i]);
        setRenderSVG(cropInfo[i]);
        setSideSVG(cropInfo[i]);
        putMiddle();
      }
    }
    timeRender = <number>cropInfo[cropInfo.length - 1].timestampUS / 1000000;
  });
}

/** Sets and displays middle SVG element as backgroud. */
function setRenderSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  middleBox.style.display = 'block';
  const ratio = videoResize.ratio;
  middleBox.setAttribute('x', `${renderInfo.x * ratio}`);
  middleBox.setAttribute('y', `${renderInfo.y * ratio}`);
  middleBox.style.width = `${renderInfo.width * ratio}`;
  middleBox.style.height = `${renderInfo.height * ratio}`;
  const color = videoCropInfoSingle.padding_color as Color;
  middleBox.style.fill = `rgb(${color.r}, ${color.g}, ${color.b})`;
}
/** Sets and displays side SVG elements as masking. */
function setSideSVG(videoCropInfoSingle: ExternalRenderingInformation): void {
  const renderInfo = videoCropInfoSingle.renderToLocation as Rect;
  maskSide.style.display = 'block';
  maskMiddle.style.display = 'block';
  const ratio = videoResize.ratio;
  leftBox.style.width = '350px';
  rightBox.style.width = '350px';
  topBox.style.width = `${renderInfo.width * ratio + 700}`;
  downBox.style.width = `${renderInfo.width * ratio + 700}`;
  rightBox.setAttribute('x', `${renderInfo.width * ratio + 350}`);
  downBox.setAttribute('y', `${Math.floor(renderInfo.height * ratio + 50)}`);
  rightBox.style.height = `${renderInfo.height * ratio}`;
  leftBox.style.height = `${renderInfo.height * ratio}`;
}

/** Scales and displays video element. */
function scaleVideo(videoCropInfoSingle: ExternalRenderingInformation) {
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
  video.style.left = `${
    videoResize.x - (cropInfo.x / videoInfo.width) * curWidth + 350
  }px`;
  video.style.top = `${
    videoResize.y - (cropInfo.y / videoInfo.height) * curHeight + 50
  }px`;
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
      .attr('y', 5)
      .attr('width', 4)
      .attr('height', 4)
      .attr('fill', 'yellow');
    shotArray.push(shot);
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
  const progressBar = <HTMLDivElement>document.getElementById('myBar-autoflip');
  const processText = <HTMLSpanElement>(
    document.getElementById('process-bar-text-autoflip')
  );
  processText.innerHTML = `${((n / size) * 100).toFixed(1)}%`;
  progressBar.style.width = `${(n / size) * 100}%`;
}

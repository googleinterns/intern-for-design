import {
  inputAspectWidth,
  inputAspectHeight,
  curAspectRatio,
  sectionNumber,
  cropWindowStorage,
  processWindow,
  videoInfo,
  handlerStorage,
  sectionIndexStorage,
  autoflipIsFree,
  updateAutoflipIsFree,
  countFFmpeg,
  updateCountFFmpeg,
  ffmpegWorkers,
  autoflipWorker,
} from './globals';

import { createDownload } from './download';

import {
  addHistoryButton,
  updateFFmpegBar,
  renderCroppedInfomation,
  renderShots,
} from './utils_crop';

/** Starts workers to process ffmpeg and autoflip */
export function startWorker(): void {
  // Reads the user inputs for aspect ratio;
  const inputHeight = inputAspectHeight.value;
  const inputWidth = inputAspectWidth.value;
  console.log(`The user input is`, inputHeight, inputWidth);
  curAspectRatio.inputWidth = Number(inputWidth);
  curAspectRatio.inputHeight = Number(inputHeight);
  addHistoryButton();
  let finished: boolean[] = [];
  for (let i = 0; i < sectionNumber; i++) {
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

  console.log(`MAIN: workers started!`);
  for (let i = 0; i < ffmpegWorkers.length; i++) {
    console.log(`MAIN: PROCESS: send the video (${i}) to worker ${i}`);
    ffmpegWorkers[i].postMessage({
      videoId: i,
      workerId: i,
      startTime: i * processWindow,
      startId: i * 30,
      workWindow: processWindow,
      user: curAspectRatio,
    });

    ffmpegWorkers[i].onmessage = function (e: MessageEvent): void {
      finished[e.data.videoId] = true;
      updateCountFFmpeg(countFFmpeg + 1);
      updateFFmpegBar(countFFmpeg);

      if (JSON.stringify(e.data.user) === JSON.stringify(curAspectRatio)) {
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
            end: e.data.videoId === sectionNumber - 1,
            user: curAspectRatio,
          });
          updateAutoflipIsFree(false);
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ]++;
        }
        const expect =
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ];
        if (finished[expect] === true && autoflipIsFree === true) {
          autoflipWorker.postMessage({
            type: 'nextCropStore',
            videoId: expect,
            startTime: expect * processWindow,
            startId: expect * 30,
            width: videoInfo.width,
            height: videoInfo.height,
            end: expect === sectionNumber - 1,
            user: curAspectRatio,
          });
          updateAutoflipIsFree(false);
          sectionIndexStorage[
            `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
          ]++;
        }
      }

      if (e.data.videoId + ffmpegWorkers.length < sectionNumber) {
        let nextVideo = e.data.videoId + ffmpegWorkers.length;
        ffmpegWorkers[e.data.workerId].postMessage({
          videoId: nextVideo,
          workerId: e.data.workerId,
          startTime: nextVideo * processWindow,
          startId: nextVideo * 30,
          workWindow: processWindow,
          user: curAspectRatio,
        });
      }
    };
  }

  /** Renders video once got the result from autoflip. */
  autoflipWorker.onmessage = function (e: MessageEvent): void {
    if (JSON.stringify(e.data.user) !== JSON.stringify(curAspectRatio)) {
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
        sectionIndexStorage[
          `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
        ];

      console.log(`finished`, finished);
      if (finished[expect] === true) {
        autoflipWorker.postMessage({
          type: 'nextCropFind',
          videoId: expect,
          startTime: expect * processWindow,
          startId: expect * 30,
          end: expect === sectionNumber - 1,
          user: curAspectRatio,
        });
        sectionIndexStorage[
          `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
        ]++;
      } else {
        updateAutoflipIsFree(true);
      }
    } else {
      const downloadButton = <HTMLButtonElement>(
        document.querySelector(
          `#download-${curAspectRatio.inputWidth}-${curAspectRatio.inputHeight}`,
        )
      );

      const wrapFunctionCreateDownload = createDownload.bind(
        e,
        curAspectRatio.inputWidth,
        curAspectRatio.inputHeight,
      );
      downloadButton.onclick = wrapFunctionCreateDownload;
      downloadButton.disabled = false;
    }
  };
}

// Creates fixed workers (ffmpeg: 4, autoflip: 1).
const ffmpegWorkers: Worker[] = [
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
];

const autoflipWorker: Worker = new Worker('src/autoflip_worker.js');
const ffmpegWorkerAudio = new Worker('src/ffmpeg_worker_audio.js');
const ffmpegWorkerCombine = new Worker('src/ffmpeg_worker_combine.js');

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

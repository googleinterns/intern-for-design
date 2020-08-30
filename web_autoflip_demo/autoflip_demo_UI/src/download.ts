import {
  videoPreview,
  canvas,
  cropWindowStorage,
  videoRecord,
  card2,
  card4,
  timerDisplay,
  videoBuffer,
  audio,
  updateAudio,
  outputStorage,
  ffmpegWorkerCombine,
  ffmpegWorkerAudio,
} from './globals';

import { ExternalRenderingInformation, Rect } from './interfaces';
export function createDownload(inputWidth: number, inputHeight: number): void {
  // Puases the main preview video player to ensure recording quality
  videoPreview.pause();
  const canvas2D = canvas.getContext('2d') as CanvasRenderingContext2D;

  const cropWindows: ExternalRenderingInformation[] =
    cropWindowStorage[`${inputHeight}&${inputWidth}`];
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

  videoPreview.currentTime = 0;
  videoRecord.play();
  startRecording();
  loop();

  function loop() {
    canvas2D.imageSmoothingEnabled = false;
    if (!videoRecord.paused && !videoRecord.ended) {
      canvas2D.drawImage(
        videoRecord,
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
    videoRecord.play();
    stream = canvas.captureStream(0);
    console.log('Started stream capture from canvas element: ', stream);
    const options = { mimeType: 'video/webm;codecs=h264' };
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(); // collect 100ms of data
    console.log('MediaRecorder started', mediaRecorder);
    card2.style.display = 'none';
    card4.style.display = 'block';
    timer();
  }

  function stopRecording(): void {
    mediaRecorder.stop();
    console.log('Recorded Blobs: ', recordedBlobs);
  }

  function download(inputWidth: number, inputHeight: number): void {
    const blob = new Blob([outputStorage[`${inputWidth}&${inputHeight}`]], {
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
      card2.style.display = 'flex';
      card4.style.display = 'none';
      outputStorage[`${inputWidth}&${inputHeight}`] = output;
      download(inputWidth, inputHeight);
      const downloadButton = <HTMLButtonElement>(
        document.querySelector(`#download-${inputWidth}-${inputHeight}`)
      );
      downloadButton.onclick = null;
      const wrapFunctionDownload = download.bind(e, inputWidth, inputHeight);
      downloadButton.addEventListener('click', wrapFunctionDownload);
    };
  }

  videoRecord.addEventListener('timeupdate', function (): void {
    for (let i = 0; i < cropWindows.length; i++) {
      let cropWindowForFrame = cropWindows[i].cropFromLocation as Rect;
      if (videoRecord.currentTime > i * (1 / 15)) {
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
export function getAudioOfVideo(): void {
  console.log('AUDIO: Main thread post video to extrat audio');
  ffmpegWorkerAudio.postMessage({
    type: 'videoData',
    video: videoBuffer,
  });

  ffmpegWorkerAudio.onmessage = function (e: MessageEvent): void {
    console.log('AUDIO: Main thread receive audio', e.data);
    if (e.data.data.buffers.length !== 0) {
      updateAudio(e.data.data.buffers[0].data);
    }
  };
}

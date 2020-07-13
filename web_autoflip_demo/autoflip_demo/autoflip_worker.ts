importScripts('visual_design_service_web_assembly_api.js');
const ctx: any = self;

let wait: number = 0;
let count: number = 0;
let frameInfoArray: any[] = [];

/** Analyzes the input frames and output caculated crop windows for each frame*/
onmessage = function (e: MessageEvent): void {
  let frameInfo = e.data;
  console.log(`AUTOFLIP: check if the video(${frameInfo.videoId}) are expected`);
  count++;
  if (wait !== frameInfo.videoId) {
    console.log(`AUTOFLIP: video(${frameInfo.videoId}) is not as expected. wait ${wait}`);
    console.log(`AUTOFLIP: store video(${frameInfo.videoId}) in array`);
    frameInfoArray[frameInfo.videoId] = frameInfo;
    console.log(frameInfoArray[frameInfo.videoId]);
    if (frameInfo.size !== count) return;
  } else {
    console.log(`AUTOFLIP: video(${frameInfo.videoId}) can be processed as wait ${wait}`);
    handleFrames(frameInfo);
  }
  if (frameInfo.size === count) {
    while (wait < frameInfo.size) {
      frameInfo = frameInfoArray[wait];
      handleFrames(frameInfo);
    }
    const endStatus = ctx.Module.__finish();
    if (!endStatus.ok) {
      console.error('loopHandleFrames', endStatus);
      throw new Error('Mediapipe had an error!');
    }
    let shots = ctx.Module.__fetchBoundaries();
    if (!shots.ok) {
      console.error('loopHandleFrames', shots);
      throw new Error('Mediapipe had an error!');
    }
    let windows = ctx.Module.__fetchCropWindows();
    if (!windows.ok) {
      console.error('loopHandleFrames', windows);
      throw new Error('Mediapipe had an error!');
    }
    console.log(endStatus, shots, windows);
    let resultCropWindows = [];
    for (let i = 0; i < windows.value.size(); i++) {
      resultCropWindows.push(windows.value.get(i));
    }
    let resultShots = [];
    for (let i = 0; i < shots.value.size(); i++) {
      resultShots.push(shots.value.get(i));
    }
    // This posts the analysis result back to main script
    ctx.postMessage({
      type: 'finishedAnalysis',
      resultShots: shots.value,
      cropWindows: resultCropWindows,
      startTime: frameInfo.startTime,
      videoId: frameInfo.videoId,
      workerId: frameInfo.workerId,
      shots: resultShots,
    });
  }
};

/** Processes input frames with autoflip wasm*/
function handleFrames(frameInfo: any): void {
  console.log(`AUTOFLIP: video (${frameInfo.videoId}) received from main`, frameInfo);

  const frames = frameInfo.frames;
  const info = { width: frameInfo.width, height: frameInfo.height };

  for (let i = 0; i < frames.length; i++) {
    const image = frames[i].data; // Array buffer from FFmpeg, .tiff <-
    // Saving array buffer to the wasm heap memory.
    const numBytes = image.byteLength;
    const ptr = ctx.Module._malloc(numBytes);
    const heapBytes = new Uint8Array(ctx.Module.HEAPU8.buffer, ptr, numBytes);
    const uint8Image = new Uint8Array(image);
    heapBytes.set(uint8Image);
    // end saving memory.
    // This is making a fake proto so that Autoflip can find the image.
    const proto = `[${ptr}, ${info.width}, ${info.height}, 16, ${numBytes}]`;
    const status = ctx.Module.__addYuvImageToBuffer(proto);
    // Do this to check if it saved correctly.
    if (!status.ok) {
      console.error(status);
      throw new Error('Autoflip had an error!');
    }
    // Finish.
    ctx.Module._free(heapBytes.byteOffset);
  }
  wait++;
}

importScripts('visual_design_service_web_assembly_api.js');
const ctx : any= self;

var recievedFrames : number = 0;
var wait: number = 0;
var count: number = 0;
var frameInfoArray: any[] = [];

/** Analyzes the input frames and output caculated crop windows for each frame*/
onmessage = function (e: MessageEvent): void {
  console.log(`AUTOFLIP: check if the frames are expected`);
  var frameInfo = e.data;
  console.log(frameInfo);
  count++;
  if (wait !== frameInfo.videoId && frameInfo.size !== count) {
    console.log(`AUTOFLIP: video(${frameInfo.videoId}) is not as expected. wait ${wait}`);
    console.log(`AUTOFLIP: store video(${frameInfo.videoId}) in array`);
    frameInfoArray[frameInfo.videoId] = frameInfo;
    console.log(frameInfoArray[frameInfo.videoId]);
    return;
  }
  console.log(`AUTOFLIP: video(${frameInfo.videoId}) can be processed as wait ${wait}`);
  console.log(frameInfo);
  handleFrames(frameInfo);
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
    console.log(recievedFrames);
    var resultCropWindows = [];
    for (var i = 0; i < recievedFrames; i++) {
      resultCropWindows.push(windows.value.get(i));
    }
    // This posts the analysis result back to main script
    ctx.postMessage({
      type: 'finishedAnalysis',
      resultShots: shots.value,
      cropWindows: resultCropWindows,
      startTime: frameInfo.startTime,
      videoId: frameInfo.videoId,
      workerId: frameInfo.workerId,
    });
  }
};

/** Processes input video array to frames */
function handleFrames(frameInfo: any): void {
  console.log(`AUTOFLIP: video (${frameInfo.videoId}) received from main`);
  console.log(frameInfo);

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
      throw new Error('Mediapipe had an error!');
    }
    // Finish.
    ctx.Module._free(heapBytes.byteOffset);
    recievedFrames++;
  }
  wait++;
}

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

importScripts('visual_design_service_web_assembly_api.js', 'ffmpeg.js');

/** Parses a string command to arguments. */
function parseArguments(text: string): string[] {
  text = text.replace(/\s+/g, ' ');
  let args: string[] = [];
  // This allows double quotes to not split args.
  text.split('"').forEach(function (t, i): void {
    t = t.trim();
    if (i % 2 === 1) {
      args.push(t);
    } else {
      args = args.concat(t.split(' '));
    }
  });
  return args;
}

/** Sends output data back to main script. */
onmessage = function (e: MessageEvent): void {
  const ctx = self as any;
  console.log(`FFMPEG: video array received from main`, e.data);

  const ffmpegWasmWorker = new ctx.Module.ffmpegWasmClass();
  const args = parseArguments(
    `-i input.webm -ss ${e.data.start} -t ${e.data.window} -vf fps=15 -c:v rawvideo -pixel_format yuv420p out_%04d.tif`,
  );

  ffmpegWasmWorker
    .callMain({
      files: [
        {
          name: 'input.webm',
          data: new Uint8Array(e.data.video),
          type: 'default_file_type',
        },
      ],
      arguments: args || [],
      returnFfmpegLogOutput: true,
      recreateFFmpegWasmInstance: true,
    })
    .then(function (result: any): void {
      console.log(`AUTOFLIP: get result frames`, result);

      const info = { width: e.data.width, height: e.data.height };
      const frames = result.buffers;

      for (let i = 0; i < frames.length; i++) {
        const image = frames[i].data; // Array buffer from FFmpeg, .tiff <-
        // Saving array buffer to the wasm heap memory.
        const numBytes = image.byteLength;
        const ptr = ctx.Module._malloc(numBytes);
        const heapBytes = new Uint8Array(
          ctx.Module.HEAPU8.buffer,
          ptr,
          numBytes,
        );
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
        cropWindows: resultCropWindows,
        shots: resultShots,
      });
    });
};

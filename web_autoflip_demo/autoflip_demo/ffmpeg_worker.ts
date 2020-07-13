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
onmessage = function (e): void {
  const ctx = self as any;
  console.log(`FFMPEG: ffmpeg Worker ${e.data.workerId}: video array received from main`);
  console.log(`FFMPEG: going to process video array(${e.data.videoId})`, e.data);

  const ffmpegWasmWorker = new ctx.Module.ffmpegWasmClass();
  const args = parseArguments(
    `-i input.webm -ss ${e.data.startTime} -t ${e.data.workWindow} -vf fps=15 -c:v rawvideo -pixel_format yuv420p out_%04d.tif`,
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
      console.log(`FFMPEG: get result frames from section ${e.data.videoId} by worker ${e.data.workerId}`, result);
      const frames = result.buffers;
      // This posts the analysis result back to main script
      ctx.postMessage({
        type: 'ffmpeg',
        videoFrames: frames,
        startTime: e.data.startTime,
        videoId: e.data.videoId,
        workerId: e.data.workerId,
        end: e.data.end,
      });
    });
};

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

importScripts('ffmpeg.js');

let videoAudio: any;
let videoMuted: any;

/** Parses a string command to arguments. */
function parseArgumentsCombine(text: string): string[] {
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
  console.log(e.data);
  videoMuted = e.data.mutedVideo;
  videoAudio = e.data.audioVideo;
  console.log(`AUDIO: recieved the video Info`, videoMuted, videoAudio);
  const ctx = self as any;
  console.log(`AUDIO: going to process video array to extract audio`, e.data);
  const ffmpegWasmWorker = new ctx.Module.ffmpegWasmClass();
  let args = parseArgumentsCombine(
    `-i input.webm -i audio.aac -c:v copy output.mp4`,
  );
  if (videoAudio === undefined) {
    args = parseArgumentsCombine(`-i input.webm -c:v copy output.mp4`);
  }

  ffmpegWasmWorker
    .callMain({
      files: [
        {
          name: 'input.webm',
          data: new Uint8Array(videoMuted),
          type: 'default_file_type',
        },
        {
          name: 'audio.aac',
          data: new Uint8Array(videoAudio),
          type: 'default_file_type',
        },
      ],
      arguments: args || [],
      returnFfmpegLogOutput: true,
      recreateFFmpegWasmInstance: true,
    })
    .then(function (result: FFmpegResult): void {
      const ctx = self as any;
      console.log(`Combine: get combine from video`, result);
      ctx.postMessage({
        type: 'combine',
        data: result,
      });
    });
};

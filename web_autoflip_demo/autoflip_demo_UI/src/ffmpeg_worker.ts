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

/** FFmpeg wasm binary resulting data. */

importScripts('ffmpeg_wasm/ffmpeg.js');
importScripts('utils_ffmpeg.js');
importScripts('utils_indexDB.js');

import { Frame, FFmpegResult } from './interfaces';

let videoBufferReceived: ArrayBuffer;

/** Sends output data back to main script. */
onmessage = function (e: MessageEvent): void {
  if (e.data.type === 'videoData') {
    videoBufferReceived = e.data.video;
    console.log(
      `ffmpeg ${e.data.workerId} recieved the video Info`,
      videoBufferReceived,
    );
  } else {
    const ctx = self as any;
    console.log(
      `FFMPEG: ffmpeg Worker ${e.data.workerId}: video array received from main`,
    );
    console.log(
      `FFMPEG: going to process video array(${e.data.videoId})`,
      e.data,
    );
    const ffmpegWasmWorker = new ctx.Module.ffmpegWasmClass();
    const args = ctx.parseArguments(
      `-ss ${e.data.startTime} -i input.webm -t ${e.data.workWindow} -vf fps=15 -c:v rawvideo -pixel_format yuv420p out_%04d.tif`,
    );
    ffmpegWasmWorker
      .callMain({
        files: [
          {
            name: 'input.webm',
            data: new Uint8Array(videoBufferReceived),
            type: 'default_file_type',
          },
        ],
        arguments: args || [],
        returnFfmpegLogOutput: true,
        recreateFFmpegWasmInstance: true,
      })
      .then(function (result: FFmpegResult): void {
        console.log(
          `FFMPEG: get result frames from section ${e.data.videoId} by worker ${e.data.workerId}`,
          result,
        );
        const frames: Frame[] = result.buffers;
        const startTime: number = e.data.startTime;
        const frameIdStart: number = startTime * 15;
        for (let i = 0; i < frames.length; i++) {
          frames[i]['frameId'] = i + frameIdStart;
        }
        ctx.addSectionFramestoIndexDB(
          frames,
          e.data.videoId,
          e.data.workerId,
          e.data.user,
        );
      });
  }
};

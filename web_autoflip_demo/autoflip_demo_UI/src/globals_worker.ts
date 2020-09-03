/**
 * Copyright 2020 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Global workers constants initialization. */
export const ffmpegWorkers: Worker[] = [
  new Worker('dist/ffmpeg_worker.js'),
  new Worker('dist/ffmpeg_worker.js'),
  new Worker('dist/ffmpeg_worker.js'),
  new Worker('dist/ffmpeg_worker.js'),
];
export const autoflipWorker: Worker = new Worker('dist/autoflip_worker.js');
export const ffmpegWorkerAudio = new Worker('dist/ffmpeg_worker_audio.js');
export const ffmpegWorkerCombine = new Worker('dist/ffmpeg_worker_combine.js');

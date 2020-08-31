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

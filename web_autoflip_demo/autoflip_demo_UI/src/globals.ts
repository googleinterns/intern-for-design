import { VideoInfo, Resize, faceDetectRegion } from './interfaces';
export const videoPreview = <HTMLVideoElement>(
  document.querySelector('#video-preview')
);
export const videoRecord = <HTMLVideoElement>(
  document.getElementById('video-record')
);
export const card1 = <HTMLDivElement>document.querySelector('#card1');
export const card2 = <HTMLDivElement>document.querySelector('#card2');
export const card3 = <HTMLDivElement>document.querySelector('#card3');
export const card4 = <HTMLDivElement>document.querySelector('#card4');
export const card31 = <HTMLDivElement>document.querySelector('#card31');
export const logHistory = <HTMLDivElement>document.querySelector('#history');
export const videoSection = <HTMLDivElement>(
  document.querySelector('#video-section')
);
export const topBox = <SVGRectElement>document.querySelector('#topBox');
export const middleBox = <SVGRectElement>document.querySelector('#middleBox');
export const middleBoxFrame = <SVGRectElement>(
  document.querySelector('#middleBoxFrame')
);
export const leftBox = <SVGRectElement>document.querySelector('#leftBox');
export const rightBox = <SVGRectElement>document.querySelector('#rightBox');
export const downBox = <SVGRectElement>document.querySelector('#downBox');
export const maskSide = <SVGSVGElement>document.querySelector('#mask-side');
export const maskMiddle = <SVGRectElement>(
  document.querySelector('#mask-middle')
);
export const detectionBoundingBox = <SVGSVGElement>(
  document.querySelector('#detection-bounding-box')
);
export const canvas: any = document.getElementById('canvas');
export const timerDisplay = <HTMLSpanElement>(
  document.getElementById('safeTimerDisplay')
);
export const inputAspectWidth = <HTMLInputElement>(
  document.querySelector('#aspect-width')
);
export const inputAspectHeight = <HTMLInputElement>(
  document.querySelector('#aspect-height')
);
export const processWindow = 2;
export let videoBuffer: ArrayBuffer;
export let videoInfo: VideoInfo;
export let sectionNumber: number = 0;
export let videoFile: File;
export let videoResize: Resize;
export let shotStorage: number[] = [];
export let curAspectRatio = { inputWidth: 1, inputHeight: 1 };
export let frameIdTill: number = 0;
export let cropWindowStorage: any = {};
export let handlerStorage: any = {};
export let sectionIndexStorage: any = {};
export let outputStorage: any = {};
export let autoflipIsFree: boolean = true;
export let countFFmpeg: number = 0;
export let countAutoflip: number = 0;
export let finished: boolean[] = [];
export let leftWidth: number = 250;
export let rightWidth: number = 250;
export let topDownHeight: number = 50;
export let timestampHeadMs: number = 0;
export let isMasked: boolean = false;
export let curFaceDetection: faceDetectRegion[];
export let audio: ArrayBuffer;
export let timeRender: number = videoPreview.duration;

// Creates fixed workers (ffmpeg: 4, autoflip: 1).
export const ffmpegWorkers: Worker[] = [
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
  new Worker('src/ffmpeg_worker.js'),
];

export const autoflipWorker: Worker = new Worker('src/autoflip_worker.js');
export const ffmpegWorkerAudio = new Worker('src/ffmpeg_worker_audio.js');
export const ffmpegWorkerCombine = new Worker('src/ffmpeg_worker_combine.js');

export function updateCountAutoflip(update: number): void {
  countAutoflip = update;
}
export function updateVideoFile(update: File): void {
  videoFile = update;
}
export function updateVideoInfo(update: VideoInfo): void {
  videoInfo = update;
}
export function updateVideoResize(update: Resize): void {
  videoResize = update;
}
export function updateSectionNumber(update: number): void {
  sectionNumber = update;
}
export function updateVideoBuffer(update: ArrayBuffer): void {
  videoBuffer = update;
}
export function updateIsMasked(update: boolean): void {
  isMasked = update;
}
export function updateAudio(update: ArrayBuffer): void {
  audio = update;
}

export function updateAutoflipIsFree(update: boolean): void {
  autoflipIsFree = update;
}

export function updateCountFFmpeg(update: number): void {
  countFFmpeg = update;
}
export function updateCurFaceDetection(update: faceDetectRegion[]): void {
  curFaceDetection = update;
}
export function updateLeftWidth(update: number): void {
  leftWidth = update;
}
export function updateRightWidth(update: number): void {
  rightWidth = update;
}
export function updateTopDownHeight(update: number): void {
  topDownHeight = update;
}
export function updateTimeRender(update: number): void {
  timeRender = update;
}

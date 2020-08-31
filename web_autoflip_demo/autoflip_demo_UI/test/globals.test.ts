import * as globals from '../src/globals';
/*
export let autoflipIsFree: boolean = true;
export let audio: ArrayBuffer;
export let countFFmpeg: number = 0;
export let countAutoflip: number = 0;
export let curFaceDetection: faceDetectRegion[];
export let leftWidth: number = 0;
export let rightWidth: number = 0;
export let numberOfSection: number = 0;
export let topHeight: number = 0;
export let timeRender: number = 3000;
export let videoBuffer: ArrayBuffer;
export let videoInfo: VideoInfo;
export let videoFile: File;
export let videoResize: Resize;
*/

describe('Test all initialization and update functions for global variables', () => {
  test('correct process for autoflip free status', () => {
    expect(globals.autoflipIsFree).toBe(true);
    globals.updateAutoflipIsFree(false);
    expect(globals.autoflipIsFree).toBe(false);
  });
  test('correct process for audio stream extract from video', () => {
    expect(globals.audio).toBe(undefined);
    let arraybuffer = new Uint8Array([1, 2, 3, 4]);
    globals.updateAudio(arraybuffer);
    expect(globals.audio).toBe(arraybuffer);
  });
  test('correct process for autoflip progress count', () => {
    expect(globals.countAutoflip).toBe(0);
    globals.updateCountAutoflip(1111);
    expect(globals.countAutoflip).toBe(1111);
  });
  test('correct process for ffmpeg progress count', () => {
    expect(globals.countFFmpeg).toBe(0);
    globals.updateCountFFmpeg(1111);
    expect(globals.countFFmpeg).toBe(1111);
  });
  test('correct process for faceDetection array', () => {
    expect(globals.curFaceDetection).toBe(undefined);
    let faceDetections = [
      { faceRegion: { x: 0, y: 0, width: 100, height: 100 } },
    ];
    globals.updateCurFaceDetection(faceDetections);
    expect(globals.curFaceDetection).toBe(faceDetections);
  });
  test('correct process for left width', () => {
    expect(globals.leftWidth).toBe(0);
    globals.updateLeftWidth(500);
    expect(globals.leftWidth).toBe(500);
  });
  test('correct process for right width', () => {
    expect(globals.rightWidth).toBe(0);
    globals.updateRightWidth(500);
    expect(globals.rightWidth).toBe(500);
  });
  test('correct process for number of total section', () => {
    expect(globals.numberOfSection).toBe(0);
    globals.updateNumberOfSection(100);
    expect(globals.numberOfSection).toBe(100);
  });
  test('correct process for topHeight', () => {
    expect(globals.topHeight).toBe(0);
    globals.updateTopHeight(100);
    expect(globals.topHeight).toBe(100);
  });
  test('correct process for time for render', () => {
    expect(globals.timeRender).toBe(3000);
    globals.updateTimeRender(3.333);
    expect(globals.timeRender).toBe(3.333);
  });
  test('correct process for time for render', () => {
    expect(globals.videoBuffer).toBe(undefined);
    let arraybuffer = new Uint8Array([1, 2, 3, 4]);
    globals.updateVideoBuffer(arraybuffer);
    expect(globals.videoBuffer).toBe(arraybuffer);
  });
  test('correct process for video information', () => {
    expect(globals.videoInfo).toBe(undefined);
    let info = { duration: 3.333, width: 100, height: 100 };
    globals.updateVideoInfo(info);
    expect(globals.videoInfo).toBe(info);
  });
  test('correct process for resize the video player', () => {
    expect(globals.videoResize).toBe(undefined);
    let resize = { x: 0, y: 0, width: 100, height: 100, ratio: 1 };
    globals.updateVideoResize(resize);
    expect(globals.videoResize).toBe(resize);
  });
});

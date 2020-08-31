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

/** Global constants for function process. */
export const processWindow = 2;

/** Global varibales for function process. */
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

export let shotStorage: number[] = [];
export let cropWindowStorage: any = {};
export let handlerStorage: any = {};
export let sectionIndexStorage: any = {};
export let outputStorage: any = {};
export let finished: boolean[] = [];
export let curAspectRatio = { inputWidth: 0, inputHeight: 0 };

/** Update functions for global variables */
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
export function updateNumberOfSection(update: number): void {
  numberOfSection = update;
}
export function updateVideoBuffer(update: ArrayBuffer): void {
  videoBuffer = update;
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
export function updateTopHeight(update: number): void {
  topHeight = update;
}
export function updateTimeRender(update: number): void {
  timeRender = update;
}

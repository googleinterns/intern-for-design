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

/** The interface defines a cropping information object. */
interface CropInfo {
  /** The information type, like "finishedAnalysis", "sectionAnalysis". */
  type: string;
  /** The crop windows for processed frames. */
  cropWindows: ExternalRenderingInformation[];
  /** The shots positions for processed frames. */
  shots: number[];
  /** The first frame Id of the section. */
  startId: number;
  /** The sequence Id of the video. */
  videoId: number;
  user: { inputWidth: number; inputHeight: number };
  faceDetections: faceDetectRegion[][];
}

/** The interface defines information for a resizing dimension. */
interface Resize {
  /** The width of the resized rectangle window. */
  width: number;
  /** The height of the resized rectangle window. */
  height: number;
  /** The x position (left) of the resized rectangle window.*/
  x: number;
  /** The y postion (top) of the resized rectangle window. */
  y: number;
  /** The resize ratio compared to original video dimension. */
  ratio: number;
}

/** The interface defines a video information object. */
interface VideoInfo {
  /** The duration of the video. */
  duration: number;
  /** The width of the video dimension. */
  width: number;
  /** The height of the video dimension.*/
  height: number;
}

/** FFmpeg wasm binary resulting data. */
interface FFmpegResult {
  /** FFmpeg stdout output. Only filled if returnFfmpegLogOutput is true. */
  stdout: string | undefined;
  /** FFmpeg stderr output. Only filled if returnFfmpegLogOutput is true. */
  stderr: string | undefined;
  /** FFmpeg file buffers. */
  buffers: Frame[];
  /** FFmpeg time till result in ms. */
  duration: number;
}

/** The decode data of a single video frame stored as a row in indexDB */
interface Frame {
  /** The generate frame name from ffmpeg */
  name: string;
  /** The decode data for the frame */
  data: ArrayBuffer;
  /** The sequence number of frame of the whole video */
  frameId: number;
}

/**
 * A message signal from main script to autoflip worker to
 * indicate processing of next section of the videoData.
 */
interface Signal {
  /**
   * The type of the message to indicate the state of the
   * section to crop, for example "firstCrop"
   */
  type: string;
  /** The video section sequence number, start from 0 */
  videoId: number;
  /** The start frameId of the video section */
  startId: number;
  /** The start timestamp of the video section */
  startTime: number;
  /** The width dimention of the video */
  width: number;
  /** The height dimention of the video */
  height: number;
  /** The processing window, the duration of the section (2s) */
  window: number;
  /** The indicator of the last section of the video */
  end: boolean;
  /** The user input parameters for cropping */
  user: { inputWidth: number; inputHeight: number };
}

/**
 * A rectangle element with position information
 */
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A color defined with r, g, b
 */
interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * Self-contained message that provides all needed information to render
 * autoflip with an external renderer.
 */
interface ExternalRenderingInformation {
  /**
   * Rect that must be cropped out of the input frame.  It is in the original
   * dimensions of the input video.  The first step to render this frame is to
   * crop this rect from the input frame.
   */
  cropFromLocation?: Rect;
  /**
   * The placement location where the above rect is placed on the output frame.
   * This will always have the same aspect ratio as the above rect but scaling
   * may be required
   */
  renderToLocation?: Rect;
  /**
   * If render_to_location is smaller than the output dimensions of the frame,
   * fill the rest of the frame with this color.
   */
  padding_color?: Color;
  /**
   * Timestamp in microseconds of this frame.
   */
  timestampUS?: number;
  /**
   * Target width of the cropped video in pixels. |render_to_location| is
   * relative to this dimension
   */
  targetWidth?: number;
  /**
   * Target height of the cropped video in pixels. |render_to_location| is
   * relative to this dimension
   */
  targetHeight?: number;
}

/**
 * Self-contained message that provides information for a face bounding box
 */
interface faceDetectRegion {
  /**
   * Face bounding box for detecting full face.
   */
  faceRegion?: Rect | undefined;
  /**
   * Signal as numbers reprentes the type of the signal (full face, landmarks).
   */
  signalType?: number;
  /**
   * Caculated importance score for the detected signal.
   */

  score?: number;
  /**
   * Timestamp in microseconds of the detected face bounding box.
   */
  timestamp?: number;
}

/**
 * The information used for refeed autoflip sceneCropping caculator.
 */
interface RefeedSignals {
  /**
   * The border signals of the whole video.
   */
  borders: { border: string; timestamp: number }[];
  /**
   * The feature detection signals of the whole video.
   */
  detections: { detection: string; timestamp: number }[];
  /**
   * The shot signals of the whole video.
   */
  shots: { shot: boolean; timestamp: number }[];
}

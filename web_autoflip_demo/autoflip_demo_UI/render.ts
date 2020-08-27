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

$('.custom-video-area').each(function () {
  const $input_video = $(this).find('#video-display');
  const $main_video_play = $(this).find('#main-video-play');
  const $main_video_pause = $(this).find('#main-video-pause');
  const $main_video_time_current = $(this).find('#main-video-time-current');
  const $main_video_time_duration = $(this).find('#main-video-time-duration');
  const $main_video_frame = $(this).find('#main-video-frame');
  const $main_video_offset_bar = $(this).find('#main-video-offset-bar');
  const $main_video_offset_bar_progress = $(this).find(
    '#main-video-offset-bar-progress',
  );
  const $main_video_offset_bar_events = $(this).find(
    '#main-video-offset-bar-events',
  );
  const $main_video_offset = $(this).find('#main-video-offset');
  const $main_video_volume_bar = $(this).find('#main-video-volume-bar');
  const $main_video_volume_offset = $(this).find('#main-video-volume-offset');
  const $main_video_volume_off = $(this).find('#main-video-volume-off');
  const $main_video_volume_down = $(this).find('#main-video-volume-down');
  const $main_video_volume_event = $(this).find('#main-video-volume-event');
  const $main_video_play_controls = $(this).find('#main-video-play-controls');
  const $main_video_play_slider = $(this).find('#main-video-play-slider');

  const $frameNextButton = $(this).find('#frame-button-next');
  const $framePreviousButton = $(this).find('#frame-button-previous');
  const video = $input_video[0] as HTMLVideoElement;

  $frameNextButton.click(function (): void {
    nextFrame();
  });
  $framePreviousButton.click(function (): void {
    previousFrame();
  });

  /** Makes video offset move forward by one frame. */
  function nextFrame(): void {
    const nextTime = video.currentTime + 1 / 15;
    if (nextTime > video.duration) {
      video.currentTime = 0;
    }
    video.currentTime = nextTime;
  }

  /** Makes video offset move back by one frame. */
  function previousFrame(): void {
    const preTime = video.currentTime - 1 / 15;
    if (preTime > video.duration) {
      video.currentTime = 0;
    }
    video.currentTime = preTime;
  }

  /** Toggles play/pause for the video. */
  function playVideo(): void {
    if (video.paused) {
      video.play();
      $main_video_pause.css('display', 'block');
      $main_video_play.css('display', 'none');
    } else {
      video.pause();
      $main_video_pause.css('display', 'none');
      $main_video_play.css('display', 'block');
    }
  }

  // Adds click events for play/pause on video.
  $input_video.click(function (): void {
    playVideo();
  });
  $main_video_play.click(function (): void {
    playVideo();
  });
  $main_video_pause.click(function (): void {
    playVideo();
  });

  /** Calles when video tag loads file, then play the video. */
  $input_video.on('loadedmetadata', function (): void {
    $main_video_time_current.text(time_format(0));
    $main_video_time_duration.text(time_format(video.duration));
    $main_video_play_controls.css('visibility', 'visible');
    $main_video_play_slider.css('visibility', 'visible');
    $input_video.css('border', 'none');
    playVideo();
    updateVolume(0, 0.7);
  });

  /** Converts the seconds to MM:SS string format. */
  function time_format(seconds: number): string {
    const m: string =
      Math.floor(seconds / 60) < 10
        ? '0' + Math.floor(seconds / 60)
        : '' + Math.floor(seconds / 60);
    const s: string =
      Math.floor(seconds - Number(m) * 60) < 10
        ? '0' + Math.floor(seconds - Number(m) * 60)
        : '' + Math.floor(seconds - Number(m) * 60);
    return m + ':' + s;
  }

  /** Adds timeupdate event to video element and adjust bar
   *  elements according to video time.
   */
  $input_video.on('timeupdate', function (): void {
    const leftOffset = Number(
      $main_video_offset_bar.css('x').replace(/[^-\d\.]/g, ''),
    );
    $main_video_time_current.text(time_format(video.currentTime));
    $main_video_time_duration.text(time_format(video.duration));
    $main_video_frame.text((video.currentTime * 15).toFixed(0));
    const perc = video.currentTime / video.duration;
    const width = <number>$main_video_offset_bar.width() * perc;
    $main_video_offset_bar_progress.css('width', width);
    $main_video_offset.css('cx', width + leftOffset);
  });

  /** Updates the elemnts forming the control bar of the video */
  function updatebar(x: number): void {
    let leftOffset = Number(
      $main_video_offset_bar.css('x').replace(/[^-\d\.]/g, ''),
    );
    const box = $main_video_offset_bar_progress.offset() as JQuery.Coordinates;
    const $position = x - box.left;

    $main_video_offset.css('cx', $position + leftOffset);
    $main_video_offset_bar_progress.css('width', $position + leftOffset);
    let $percentage =
      ($position / <number>$main_video_offset_bar.width()) * 100;
    if ($percentage > 100) {
      $percentage = 100;
    }
    if ($percentage < 0) {
      $percentage = 0;
    }
    video.currentTime = (video.duration * $percentage) / 100;
  }

  // Indiates if the drag event is happening.
  let timeDrag = false;

  // Defines all the events related to drag the video progress bar.
  $main_video_offset_bar_events.on('mousedown', function (
    e: JQuery.MouseDownEvent,
  ): void {
    timeDrag = true;
    updatebar(e.pageX);
  });
  $main_video_offset.on('mousedown', function (e: JQuery.MouseDownEvent): void {
    timeDrag = true;
    updatebar(e.pageX);
  });
  $(document).on('mouseup', function (e: JQuery.MouseUpEvent): void {
    if (timeDrag) {
      timeDrag = false;
      updatebar(e.pageX);
    }
  });
  $(document).on('mousemove', function (e: JQuery.MouseMoveEvent): void {
    if (timeDrag) {
      updatebar(e.pageX);
    }
  });

  // Mutes video on button click.
  $main_video_volume_down.click(function (): void {
    playSound();
  });
  $main_video_volume_off.click(function (): void {
    playSound();
  });

  /** Plays video sound when the video is unmuted. */
  function playSound(): void {
    video.muted = !video.muted;
    if (video.muted) {
      $main_video_volume_offset.css('width', 0);
      $main_video_volume_down.css('display', 'none');
      $main_video_volume_off.css('display', 'block');
    } else {
      $main_video_volume_offset.css('width', video.volume * 100 + '%');
      $main_video_volume_down.css('display', 'block');
      $main_video_volume_off.css('display', 'none');
    }
  }
  /** Updates volume when the video volume is changed. */
  function updateVolume(x: number, vol: number): void {
    let $percentage: number;
    if (vol) {
      $percentage = vol * 100;
    } else {
      const box = $main_video_volume_bar.offset() as JQuery.Coordinates;
      const $position = x - box.left;
      $percentage = (100 * $position) / <number>$main_video_volume_bar.width();
    }
    if ($percentage > 100) {
      $percentage = 100;
    }
    if ($percentage < 0) {
      $percentage = 0;
    }

    // Updates volume bar and video volume.
    $main_video_volume_offset.css('width', $percentage + '%');
    video.volume = $percentage / 100;

    if (video.volume == 0) {
      $main_video_volume_down.css('display', 'none');
      $main_video_volume_off.css('display', 'block');
    } else if (video.volume > 0.5) {
      $main_video_volume_down.css('display', 'block');
      $main_video_volume_off.css('display', 'none');
    }
  }

  // Drag state and events to drag and adjust video volumn.
  let volumeDrag = false;
  $main_video_volume_event.on('mousedown', function (
    e: JQuery.MouseDownEvent,
  ): void {
    volumeDrag = true;
    video.muted = false;
    updateVolume(e.pageX, 0);
  });
  $(document).on('mouseup', function (e: JQuery.MouseUpEvent): void {
    if (volumeDrag) {
      volumeDrag = false;
      updateVolume(e.pageX, 0);
    }
  });
  $(document).on('mousemove', function (e: JQuery.MouseMoveEvent): void {
    if (volumeDrag) {
      updateVolume(e.pageX, 0);
    }
  });
});


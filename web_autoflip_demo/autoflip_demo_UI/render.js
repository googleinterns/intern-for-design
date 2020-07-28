$('.custom-video-area').each(function () {
  var $input_video = $(this).find('#video-display');
  var $main_video_play = $(this).find('#main-video-play');
  var $main_video_pause = $(this).find('#main-video-pause');

  var $main_video_time_current = $(this).find('#main-video-time-current');
  var $main_video_time_duration = $(this).find('#main-video-time-duration');
  var $main_video_frame = $(this).find('#main-video-frame');
  var $main_video_offset_bar = $(this).find('#main-video-offset-bar');
  var $main_video_offset_bar_progress = $(this).find(
    '#main-video-offset-bar-progress',
  );
  var $main_video_offset_bar_events = $(this).find(
    '#main-video-offset-bar-events',
  );
  var $main_video_offset = $(this).find('#main-video-offset');

  var $main_video_volume_bar = $(this).find('#main-video-volume-bar');
  var $main_video_volume_offset = $(this).find('#main-video-volume-offset');
  var $main_video_volume_off = $(this).find('#main-video-volume-off');
  var $main_video_volume_down = $(this).find('#main-video-volume-down');
  var $main_video_volume_event = $(this).find('#main-video-volume-event');
  var $main_video_play_controls = $(this).find('#main-video-play-controls');
  var $main_video_play_slider = $(this).find('#main-video-play-slider');

  var $frameNextButton = $(this).find('#frame-button-next');
  $frameNextButton.click(function () {
    nextFrame();
  });

  // Toggles play/pause for the video
  function nextFrame() {
    const nextTime = $input_video[0].currentTime + 1 / 15;
    if (nextTime > $input_video[0].duration) {
      $input_video[0].currentTime = 0;
    }
    $input_video[0].currentTime = nextTime;
  }

  var $framePreviousButton = $(this).find('#frame-button-previous');
  $framePreviousButton.click(function () {
    previousFrame();
  });

  // Toggles play/pause for the video
  function nextFrame() {
    const nextTime = $input_video[0].currentTime + 1 / 15;
    if (nextTime > $input_video[0].duration) {
      $input_video[0].currentTime = 0;
    }
    $input_video[0].currentTime = nextTime;
  }

  // Toggles play/pause for the video
  function previousFrame() {
    const preTime = $input_video[0].currentTime - 1 / 15;
    if (preTime > $input_video[0].duration) {
      $input_video[0].currentTime = 0;
    }
    $input_video[0].currentTime = preTime;
  }

  // Toggles play/pause for the video
  function playVideo() {
    if ($input_video[0].paused) {
      $input_video[0].play();
      $main_video_pause.css('display', 'block');
      $main_video_play.css('display', 'none');
    } else {
      $input_video[0].pause();
      $main_video_pause.css('display', 'none');
      $main_video_play.css('display', 'block');
    }
  }
  // Play/pause on video click
  $input_video.click(function () {
    playVideo();
  });
  $main_video_play.click(function () {
    playVideo();
  });
  $main_video_pause.click(function () {
    playVideo();
  });

  $input_video.on('loadedmetadata', function () {
    $main_video_time_current.text(time_format(0));
    $main_video_time_duration.text(time_format($input_video[0].duration));
    $main_video_play_controls.css('visibility', 'visible');
    $main_video_play_slider.css('visibility', 'visible');
    $input_video.css('border', 'none');
    updateVolume(0, 0.7);
  });

  function time_format(seconds) {
    var m =
      Math.floor(seconds / 60) < 10
        ? '0' + Math.floor(seconds / 60)
        : Math.floor(seconds / 60);
    var s =
      Math.floor(seconds - m * 60) < 10
        ? '0' + Math.floor(seconds - m * 60)
        : Math.floor(seconds - m * 60);
    return m + ':' + s;
  }

  // Video duration timer
  $input_video.on('timeupdate', function () {
    var leftOffset = Number(
      $main_video_offset_bar.css('x').replace(/[^-\d\.]/g, ''),
    );
    $main_video_time_current.text(time_format($input_video[0].currentTime));
    $main_video_time_duration.text(time_format($input_video[0].duration));
    $main_video_frame.text(($input_video[0].currentTime * 15).toFixed(0));
    var perc = $input_video[0].currentTime / $input_video[0].duration;
    var width = $main_video_offset_bar.width() * perc;
    $main_video_offset_bar_progress.css('width', width);
    $main_video_offset.css('cx', width + leftOffset);
  });

  function updatebar(x) {
    var leftOffset = Number(
      $main_video_offset_bar.css('x').replace(/[^-\d\.]/g, ''),
    );
    $position = x - $main_video_offset_bar_progress.offset().left;

    $main_video_offset.css('cx', $position + leftOffset);
    $main_video_offset_bar_progress.css('width', $position + leftOffset);
    $percentage = ($position / $main_video_offset_bar.width()) * 100;
    if ($percentage > 100) {
      $percentage = 100;
    }
    if ($percentage < 0) {
      $percentage = 0;
    }

    $input_video[0].currentTime =
      ($input_video[0].duration * $percentage) / 100;
  }

  // VIDEO PROGRESS BAR
  //when video timebar clicked

  var timeDrag = false; /* check for drag event */

  $main_video_offset_bar_events.on('mousedown', function (e) {
    timeDrag = true;
    updatebar(e.pageX);
  });
  $main_video_offset.on('mousedown', function (e) {
    timeDrag = true;
    updatebar(e.pageX);
  });
  $(document).on('mouseup', function (e) {
    if (timeDrag) {
      timeDrag = false;
      updatebar(e.pageX);
    }
  });
  $(document).on('mousemove', function (e) {
    if (timeDrag) {
      updatebar(e.pageX);
    }
  });

  // Mute video on button click
  $main_video_volume_down.click(function () {
    playSound();
  });
  $main_video_volume_off.click(function () {
    playSound();
  });

  function playSound() {
    $input_video[0].muted = !$input_video[0].muted;
    if ($input_video[0].muted) {
      $main_video_volume_offset.css('width', 0);
      $main_video_volume_down.css('display', 'none');
      $main_video_volume_off.css('display', 'block');
    } else {
      $main_video_volume_offset.css(
        'width',
        $input_video[0].volume * 100 + '%',
      );
      $main_video_volume_down.css('display', 'block');
      $main_video_volume_off.css('display', 'none');
    }
  }

  function updateVolume(x, vol) {
    if (vol) {
      $percentage = vol * 100;
    } else {
      $position = x - $main_video_volume_bar.offset().left;
      $percentage = (100 * $position) / $main_video_volume_bar.width();
    }

    if ($percentage > 100) {
      $percentage = 100;
    }
    if ($percentage < 0) {
      $percentage = 0;
    }

    //update volume bar and video volume
    $main_video_volume_offset.css('width', $percentage + '%');
    $input_video[0].volume = $percentage / 100;

    if ($input_video[0].volume == 0) {
      $main_video_volume_down.css('display', 'none');
      $main_video_volume_off.css('display', 'block');
    } else if ($input_video[0].volume > 0.5) {
      $main_video_volume_down.css('display', 'block');
      $main_video_volume_off.css('display', 'none');
    }
  }

  // Volume Drag
  var volumeDrag = false;
  $main_video_volume_event.on('mousedown', function (e) {
    volumeDrag = true;
    $input_video[0].muted = false;
    updateVolume(e.pageX);
  });

  $(document).on('mouseup', function (e) {
    if (volumeDrag) {
      volumeDrag = false;
      updateVolume(e.pageX);
    }
  });

  $(document).on('mousemove', function (e) {
    if (volumeDrag) {
      updateVolume(e.pageX);
    }
  });
});

$(window).resize(() => {
  const card3 = document.querySelector('#card3');
  const videoSection = document.querySelector('#video-section');
  const topBox = document.querySelector('#topBox');
  const videoPerview = document.querySelector('#video-display');
  let left = (card3.offsetWidth - topBox.getBoundingClientRect().width) / 2;
  if (topBox.getBoundingClientRect().width === 0) {
    left = (card3.offsetWidth - videoPerview.offsetWidth) / 2;
  }
  if (left < 0) {
    left = 0;
  }

  videoSection.style.marginLeft = `${left}px`;
});

import {
  shotStorage,
  leftBox,
  rightBox,
  downBox,
  topBox,
  isMasked,
  updateIsMasked,
} from './globals';

const shotButton = <HTMLLIElement>document.querySelector('#shot-button');
shotButton.onclick = nextShot;

const maskButton = <HTMLLIElement>document.querySelector('#mask-button');
maskButton.onclick = maskVideo;

/** Moves the time of the video to the next shot position. */
function nextShot(): void {
  const videoPerview = <HTMLVideoElement>(
    document.querySelector('#video-display')
  );
  const time: number = videoPerview.currentTime;
  for (let i = 0; i < shotStorage.length; i++) {
    if (shotStorage[i] / 1000000 > time) {
      videoPerview.currentTime = shotStorage[i] / 1000000;
      return;
    }
  }
  videoPerview.currentTime = shotStorage[0];
}

/** Masks the cropped part of the video. */
function maskVideo(): void {
  if (leftBox.style.fill === 'white') {
    maskButton.innerHTML = 'Mask';
    leftBox.style.fill = 'black';
    rightBox.style.fill = 'black';
    downBox.style.fill = 'black';
    topBox.style.fill = 'black';
    leftBox.setAttribute('fill-opacity', '50%');
    rightBox.setAttribute('fill-opacity', '50%');
    downBox.setAttribute('fill-opacity', '50%');
    topBox.setAttribute('fill-opacity', '50%');
    updateIsMasked(false);
  } else {
    maskButton.innerHTML = 'Show Original';
    leftBox.style.fill = 'white';
    rightBox.style.fill = 'white';
    downBox.style.fill = 'white';
    topBox.style.fill = 'white';
    leftBox.setAttribute('fill-opacity', '100%');
    rightBox.setAttribute('fill-opacity', '100%');
    downBox.setAttribute('fill-opacity', '100%');
    topBox.setAttribute('fill-opacity', '100%');
    updateIsMasked(true);
  }
}

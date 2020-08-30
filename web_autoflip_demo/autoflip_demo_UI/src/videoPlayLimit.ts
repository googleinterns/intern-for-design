import { videoPreview, timeRender } from './globals';
// Limites the video playing part to the section finished.

videoPreview.addEventListener('timeupdate', function (): void {
  if (videoPreview.currentTime > timeRender) {
    videoPreview.currentTime = 0;
  }
});

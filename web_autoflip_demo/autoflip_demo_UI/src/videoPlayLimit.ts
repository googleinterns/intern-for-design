// Limites the video playing part to the section finished.
let timeRender: number = video.duration;
video.addEventListener('timeupdate', function (): void {
  if (video.currentTime > timeRender) {
    video.currentTime = 0;
  }
});

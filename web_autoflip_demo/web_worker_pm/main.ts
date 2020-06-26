// global array buffer object to save data and pass to web worker
declare let buffer: ArrayBuffer;

// this function is called when the input loads a video
function videoToBuffer() {
  const file = (<HTMLInputElement>event.target).files[0];
  console.log('video file has been chosen');
  console.log(file);
  const reader = new FileReader();
  reader.onload = function () {
    buffer = reader.result as ArrayBuffer;
    console.log('video converted to array buffer');
  };
  reader.readAsArrayBuffer(file);
}

// this function is used to start a new worker
function startWorker() {
  const myWorker = new Worker('worker.js');
  myWorker.postMessage(buffer);
  console.log('passed array buffer to web worker');
  myWorker.onmessage = function (e) {
    console.log(e.data);
    console.log('video received from worker');
    // render the received video
    renderVideo(e.data);
  };
}

// this function is for displaying video content
function renderVideo(videoBuffer: ArrayBuffer) {
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
  const objectURL = URL.createObjectURL(videoBlob);
  document.getElementById('data-vid').innerHTML =
    "<video width='400' controls><source id='vid-source' src='" + objectURL + "'type='video/mp4'></video>";
  document.getElementById('name-vid').innerHTML = videoBlob.type;
}

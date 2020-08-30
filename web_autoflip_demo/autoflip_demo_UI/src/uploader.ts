import { updateVideoFile } from './globals';
import { handleOnChange } from './main';

const demoButton = <HTMLButtonElement>document.querySelector('#start-demo');
demoButton.onclick = startDemo;

const dropArea = <HTMLDivElement>document.querySelector('.zone');
dropArea.addEventListener('drop', dropHandler);
dropArea.addEventListener('dragover', dragOverHandler);
dropArea.addEventListener('dragleave', dragLeaveHandler);

/** Uploads a pre-stored demo video as input. */
function startDemo(): void {
  const getFileBlob = function (url: string, cb: Function): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.addEventListener('load', function (): void {
      cb(xhr.response);
    });
    xhr.send();
  };
  const blobToFile = function (blob: File, name: string): File {
    return blob;
  };
  const getFileObject = function (filePathOrUrl: string, cb: Function): void {
    getFileBlob(filePathOrUrl, function (blob: File) {
      cb(blobToFile(blob, 'movie.mp4'));
    });
  };
  getFileObject('src/demo_video/movie.mp4', function (fileObject: File): void {
    updateVideoFile(fileObject);
    handleOnChange(<Event>event);
  });
}

/**
 * The drop event handler for the file drag and drop section.
 * @param ev
 */
function dropHandler(ev: DragEvent): void {
  dropArea.style.background = 'transparent';
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  if (ev.dataTransfer !== null && ev.dataTransfer.items[0].kind === 'file') {
    const file = ev.dataTransfer.items[0].getAsFile() as File;
    updateVideoFile(file);
    handleOnChange(ev);
  }
}
/**
 * The dropover event handler for the file drag and drop section.
 * @param ev
 */
function dragOverHandler(ev: Event): void {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  dropArea.style.background = '#4285F4';
}
/**
 * The dropleave event handler for the file drag and drop section.
 * @param ev
 */
function dragLeaveHandler(ev: Event): void {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
  dropArea.style.background = 'transparent';
}

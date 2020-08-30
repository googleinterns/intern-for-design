import {
  handlerStorage,
  curAspectRatio,
  videoPreview,
  sectionIndexStorage,
  cropWindowStorage,
  sectionNumber,
  processWindow,
  videoInfo,
  countAutoflip,
  updateCountAutoflip,
  autoflipWorker,
} from './globals';
import { addHistoryButton, updateAutoflipBar } from './utils_crop';

const changeAspectForm = <HTMLFormElement>(
  document.querySelector('#change-aspect-form')
);
const changeAspectWidth = <HTMLInputElement>(
  document.querySelector('#change-aspect-width')
);
const changeAspectHeight = <HTMLInputElement>(
  document.querySelector('#change-aspect-height')
);

changeAspectForm.onsubmit = handleChangeAspect;

function handleChangeAspect(e: Event): void {
  e.preventDefault();
  const changeInputHeight = changeAspectHeight.value;
  const changeInputWidth = changeAspectWidth.value;
  changeAspect(Number(changeInputHeight), Number(changeInputWidth));
}

export function changeAspect(
  changeInputHeight: number,
  changeInputWidth: number,
) {
  const preHandlers =
    handlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  console.log(`The user input is`, changeInputHeight, changeInputWidth);

  curAspectRatio.inputWidth = changeInputWidth;
  curAspectRatio.inputHeight = changeInputHeight;
  for (let i = 0; i < preHandlers.length; i++) {
    videoPreview.removeEventListener('timeupdate', preHandlers[i]);
  }

  console.log(`check if exist!`);
  if (
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] === undefined
  ) {
    console.log(`notexsit!`);
    addHistoryButton();
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    handlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = [];
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = 0;
  }
  const expect =
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  const windows =
    cropWindowStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  const curVideoId = Math.floor(windows.length / 30);
  updateCountAutoflip(windows.length);
  updateAutoflipBar(countAutoflip);

  const handlersCurrent =
    handlerStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ];
  for (let i = 0; i < handlersCurrent.length; i++) {
    videoPreview.addEventListener('timeupdate', handlersCurrent[i]);
  }
  if (sectionNumber === Math.ceil(windows.length / 30)) {
  } else {
    console.log(
      `post startID`,
      windows.length,
      Math.floor(windows.length / 30),
    );
    autoflipWorker.postMessage({
      type: 'changeAspectRatio',
      videoId: Math.floor(windows.length / 30),
      startId: windows.length,
      startTime: expect * processWindow,
      width: videoInfo.width,
      height: videoInfo.height,
      end: curVideoId === sectionNumber - 1,
      user: curAspectRatio,
    });
    sectionIndexStorage[
      `${curAspectRatio.inputHeight}&${curAspectRatio.inputWidth}`
    ] = Math.floor(windows.length / 30) + 1;
  }
}

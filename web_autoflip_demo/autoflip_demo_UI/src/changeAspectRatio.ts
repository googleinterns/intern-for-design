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

function changeAspect(changeInputHeight: number, changeInputWidth: number) {
  const preHandlers =
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`];
  console.log(`The user input is`, changeInputHeight, changeInputWidth);

  userInput.inputWidth = changeInputWidth;
  userInput.inputHeight = changeInputHeight;
  for (let i = 0; i < preHandlers.length; i++) {
    video.removeEventListener('timeupdate', preHandlers[i]);
  }

  console.log(`check if exist!`);
  if (
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] === undefined
  ) {
    console.log(`notexsit!`);
    addHistoryButton();
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`] = [];
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] = 0;
  }
  const expect = expected[`${userInput.inputHeight}&${userInput.inputWidth}`];
  const windows =
    cyclesCropWindows[`${userInput.inputHeight}&${userInput.inputWidth}`];
  const curVideoId = Math.floor(windows.length / 30);
  counta = windows.length;
  updateAutoflipBar(counta);

  const handlersCurrent =
    handlers[`${userInput.inputHeight}&${userInput.inputWidth}`];
  for (let i = 0; i < handlersCurrent.length; i++) {
    video.addEventListener('timeupdate', handlersCurrent[i]);
  }
  if (size === Math.ceil(windows.length / 30)) {
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
      end: curVideoId === size - 1,
      user: userInput,
    });
    expected[`${userInput.inputHeight}&${userInput.inputWidth}`] =
      Math.floor(windows.length / 30) + 1;
  }
}

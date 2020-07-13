# Intern Project Demo

This project is for showing how the AutoFlip works and rendering cropped user input videos.
This demo uses a single worker for processing ffmpeg and autoflip.

## Installation

The project requires NodeJs, TypeScript and NPM installed.

## Build

In folder web_autoflip_demo

```
npm install
```

Inside the folder autoflip_demo_fixedWorkerPool, run the command to build the ts files.

```
cd  web_autoflip_demo/autoflip_demo_fixedWorkerPool
```

```
tsc
```

## Usage

Open the autoflip.html inside the folder to see the project.

Step1: Upload the dogPlay.wasm file inside the folder.

Step2: Click "start worker" button to process the video.

Step3: wait 3-5 minutes and you will see the video displaying in Autoflip section.

(Open chrome developer tools to see all the logs)

See following gif also for how to run the project.

![](GIF/first.gif)
![](GIF/last.gif)

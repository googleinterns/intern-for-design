# Intern Project Demo

This project is for showing how the AutoFlip works and rendering cropped user input videos.
This demo uses fixed workers for processing ffmpeg and autoflip, 4 workers for ffmpeg, 1 for autoflip.
The UI is designed to show the video as well as cropping parameters of Autoflip.

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

Upload video file:

1. Drag and drop file in drag&drop section.
2. Click button 'select file' to upload a file.
3. Click button 'try our demo' to upload a demo video.

Wait for progress bar to finish.

Play with video control and control buttons.

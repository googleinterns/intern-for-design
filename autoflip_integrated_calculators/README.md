Text detection, active speaker detection and TransNetV2 shot boundary detection Calculators for AutoFlip.

MediaPipe: https://github.com/google/mediapipe

AutoFlip: https://github.com/google/mediapipe/tree/master/mediapipe/examples/desktop/autoflip

To use the text detection, active speaker detection and TransNetV2 shot boundary detection, please follow the instructions below.

# Install Mediapipe
Checkout the repository and follow the installation instructions to set up MediaPipe.

```
git clone https://github.com/google/mediapipe.git
cd mediapipe
```
# Config
Download active_speaker_development.pbtxt, shot_boundary_development.pbtxt, autoflip_graph.pbtxt, autoflip_graph_development.pbtxt, autoflip_messages.proto, BUILD. Replace the original files in /mediapipe/examples/desktop/autoflip.

# Calculators
Copy all the .cc and .proto files in calculators folder, and paste them into /mediapipe/examples/desktop/autoflip/calculators. Copy the content of the BULID in calculators and add them into /mediapipe/examples/desktop/autoflip/calculators/BUILD.

# Subgraphs
Copy all the .pbtxt files in subgraph folder, and paste them into /mediapipe/examples/desktop/autoflip/subgraph. Copy the content of the BULID in subgraph and add them into /mediapipe/examples/desktop/autoflip/subgraph/BUILD.

# Models
Save the files in models folder to /mediapipe/models.

# Opencv
This is only required by text detection. If you do not need text detection. Comment out the text detecton node in graphs and skip this part. Otherwise, install opencv dnn module (require opencv 3.x or higher) first since default mediapipe does not require it. 

Copy opencv_dnn_inc.h in framework_port folder, and paste it into /framework/port. Copy the content of the BULID in framework_port and add them into /framework/port/BUILD.

Add libopencv_dnn at the end of srcs of “opencv” in /third_party/opencv_yourOS.BUILD. NOTE: the dnn module name may change. For example, if you use linux, add "lib/libopencv_dnn.so" in /third_party/opencv_linux.BUILD. If you use macOS, add "local/opt/opencv@3/lib/libopencv_dnn.dylib" in /third_party/opencv_macos.BUILD.

# Build and run
```
bazel build -c opt --define MEDIAPIPE_DISABLE_GPU=1   mediapipe/examples/desktop/autoflip:run_autoflip
```

```
GLOG_logtostderr=1 bazel-bin/mediapipe/examples/desktop/autoflip/run_autoflip \  --calculator_graph_config_file=mediapipe/examples/desktop/autoflip/autoflip_graph.pbtxt \--input_side_packets=input_video_path=/absolute/path/to/the/local/video/file,output_video_path=/absolute/path/to/save/the/output/video/file,aspect_ratio=width:height
```

# Speaker signal visualization (Optional)
If you want to output the active speaker contour signal, run

```
GLOG_logtostderr=1 bazel-bin/mediapipe/examples/desktop/autoflip/run_autoflip \  --calculator_graph_config_file=mediapipe/examples/desktop/autoflip/active_speaker_development.pbtxt \--input_side_packets=input_video_path=/absolute/path/to/the/local/video/file,contour_information_frames_path=/absolute/path/to/save/the/output/video/file
```

# Shot boundary detection visualization (Optional)
If you want to visualize the shot boundary detection, run

```
GLOG_logtostderr=1 bazel-bin/mediapipe/examples/desktop/autoflip/run_autoflip \  --calculator_graph_config_file=mediapipe/examples/desktop/autoflip/shot_boundary_development.pbtxt \--input_side_packets=input_video_path=/absolute/path/to/the/local/video/file,boundary_information_frames_path=/absolute/path/to/save/the/output/video/file
```


## Reference
1. Text detection model is EAST: https://arxiv.org/abs/1704.03155v2.

2. Shot boundary detection model is TransNetV2: https://github.com/soCzech/TransNetV2.
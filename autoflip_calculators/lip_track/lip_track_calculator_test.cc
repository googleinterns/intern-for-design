// Copyright 2019 The MediaPipe Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "absl/strings/string_view.h"
#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/lip_track_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/location_data.pb.h"
#include "mediapipe/framework/formats/landmark.pb.h"
#include "mediapipe/framework/formats/rect.pb.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"
#include "mediapipe/framework/port/parse_text_proto.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_matchers.h"
#include "mediapipe/framework/port/opencv_core_inc.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"



namespace mediapipe {
namespace autoflip {
namespace {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kInputLandmark[] = "LANDMARKS";
constexpr char kInputROI[] = "DETECTIONS";
constexpr char kOutputROI[] = "DETECTIONS_SPEAKERS";
constexpr char kOutputShot[] = "IS_SPEAKER_CHANGE";

const int32 kImagewidth = 800; 
const int32 kImageheight = 600;
const int32 kFaceMeshLandmarks = 468;

// Lip contour landmarks.
// Lip left inner corner: 78, lip right inner corner: 308.
// Lip upper {82, 13, 312}, lip lower {87, 14, 317};
const std::vector<int32> kLandmarksIdx{78, 308, 82, 13, 312, 87, 14, 317};
// x,y,z of 6 landmarks
const std::vector<std::vector<float>> kLandmaksValueOneClose{{0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0}};
const std::vector<std::vector<float>> kLandmaksValueOneOpen{{0.1,0.5,0, 0.5,0.5,0, 0.2,0.6,0, 0.3,0.6,0, 0.4,0.6,0, 0.2,0.4,0, 0.3,0.4,0, 0.4,0.4,0}};
const std::vector<std::vector<float>> kLandmaksValueTwoSame{{0.1,0.5,0, 0.5,0.5,0, 0.2,0.6,0, 0.3,0.6,0, 0.4,0.6,0, 0.2,0.4,0, 0.3,0.4,0, 0.4,0.4,0},
                                                        {0.1,0.5,0, 0.5,0.5,0, 0.2,0.6,0, 0.3,0.6,0, 0.4,0.6,0, 0.2,0.4,0, 0.3,0.4,0, 0.4,0.4,0}};
const std::vector<std::vector<float>> kLandmaksValueTwoDiff{{0.1,0.5,0, 0.5,0.5,0, 0.2,0.6,0, 0.3,0.6,0, 0.4,0.6,0, 0.2,0.4,0, 0.3,0.4,0, 0.4,0.4,0},
                                                        {0.1,0.5,0, 0.5,0.5,0, 0.2,0.5,0, 0.3,0.5,0, 0.4,0.5,0, 0.2,0.5,0, 0.3,0.5,0, 0.4,0.5,0}};

// ROI values
const std::vector<std::vector<float>> kRoiValueOne{{0.4, 0.1, 0.2, 0.6}};
const std::vector<std::vector<float>> kRoiValueTwoSame{{0.4, 0.1, 0.2, 0.6}, {0.5, 0.1, 0.2, 0.6}};
const std::vector<std::vector<float>> kRoiValueTwoDiff{{0.4, 0.1, 0.2, 0.6}, {0.6, 0.1, 0.2, 0.6}};

// Time stamp
const std::vector<int64> kTimeStampOne{2000};
const std::vector<int64> kTimeStampTwo{2000, 4000};

constexpr char kConfig[] = R"(
    calculator: "LipTrackCalculator"
    input_stream: "VIDEO:input_video"
    input_stream: "LANDMARKS:multi_face_landmarks"
    input_stream: "DETECTIONS:face_detections"
    output_stream: "DETECTIONS_SPEAKERS:active_speakers_detections"
    output_stream: "IS_SPEAKER_CHANGE:speaker_change"
    options: {
      [mediapipe.autoflip.LipTrackCalculatorOptions.ext]: {
        iou_threshold: 0.2
        lip_mean_threshold_big_mouth: 0.3
        lip_variance_threshold_big_mouth: 0.0
        lip_mean_threshold_small_mouth: 0.2
        lip_variance_threshold_small_mouth: 0.0
        output_shot_boundary: true
        min_shot_span: 0
        min_speaker_span: 0
      }
    })";

NormalizedLandmark CreateLandmark(const float x, const float y, const float z) {
  NormalizedLandmark landmark;
  landmark.set_x(x);
  landmark.set_y(y);
  landmark.set_z(z);
  return landmark;
}

void CreateLandmarkList(const std::vector<float>& values, NormalizedLandmarkList* list) {
  for (int i = 0; i < kFaceMeshLandmarks; ++i) 
    *list->add_landmark() = CreateLandmark(0.0f, 0.0f, 0.0f);

  int i = 0;
  for (auto& idx : kLandmarksIdx){
    list->mutable_landmark(idx)->set_x(values[i++]);
    list->mutable_landmark(idx)->set_y(values[i++]);
    list->mutable_landmark(idx)->set_z(values[i++]);
  }
}

Detection CreateRoi(const std::vector<float>& values) {
  Detection roi;
  LocationData* location_data = roi.mutable_location_data();
  location_data->set_format(LocationData::RELATIVE_BOUNDING_BOX);
  LocationData::RelativeBoundingBox* bbox = location_data->mutable_relative_bounding_box();
  bbox->set_xmin(values[0]);
  bbox->set_ymin(values[1]);
  bbox->set_width(values[2]);
  bbox->set_height(values[3]);
  return roi;
}

CalculatorGraphConfig::Node MakeConfig(const std::string base_config, const int32 history,
        const int64 min_speaker_span=0) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  config.mutable_options()
    ->MutableExtension(LipTrackCalculatorOptions::ext)
    ->set_variance_history(history);
  config.mutable_options()
    ->MutableExtension(LipTrackCalculatorOptions::ext)
    ->set_mean_history(history);
    config.mutable_options()
    ->MutableExtension(LipTrackCalculatorOptions::ext)
    ->set_min_speaker_span(min_speaker_span);
  return config;
}

void AddScene(const std::vector<float>& landmark_value, const int64 time_ms, 
              const std::vector<float>& roi_value, CalculatorRunner::StreamContentsSet* inputs) {
  // Each scene contains one input frame, one landmarkList and one ROI.
  Timestamp timestamp(time_ms);
  // Setup video
  auto input_frame =
    ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, kImagewidth, kImageheight);
  inputs->Tag(kInputVideo).packets.push_back(
    Adopt(input_frame.release()).At(timestamp));

  // Setup landmarks
  auto vec_landmarks_list = absl::make_unique<std::vector<NormalizedLandmarkList>>();
  NormalizedLandmarkList landmarks_list;
  CreateLandmarkList(landmark_value, &landmarks_list);
  vec_landmarks_list->push_back(landmarks_list);
  inputs->Tag(kInputLandmark).packets.push_back(
      Adopt(vec_landmarks_list.release()).At(timestamp));

  // Setup ROIS
  auto vec_roi = absl::make_unique<std::vector<Detection>>();
  Detection roi = CreateRoi(roi_value);
  vec_roi->push_back(roi);
  inputs->Tag(kInputROI).packets.push_back(
      Adopt(vec_roi.release()).At(timestamp));
}

void SetInputs(const std::vector<std::vector<float>>& landmark_values,
              const std::vector<int64>& time_stamps_ms, 
              const std::vector<std::vector<float>>& roi_values,
              CalculatorRunner* runner) {
  for (int i = 0; i < time_stamps_ms.size(); ++i){
    AddScene(landmark_values[i], time_stamps_ms[i], roi_values[i], runner->MutableInputs());
  }
}

void CheckOutputs(const int32 scene_num, const std::vector<int32>& gt_output_nums,
    const std::vector<std::vector<float>>& roi_values, CalculatorRunner* runner) {
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputROI).packets;
  ASSERT_EQ(scene_num, output_packets.size());
  
  std::vector<Detection> bboxes;
  for (int i = 0; i < scene_num; ++i){
    bboxes = output_packets[i].Get<std::vector<Detection>>();
    EXPECT_EQ(gt_output_nums[i], bboxes.size());
    if (gt_output_nums[i] == 0)
      continue;
    EXPECT_FLOAT_EQ(roi_values[i][0], bboxes[0].location_data().relative_bounding_box().xmin());
    EXPECT_FLOAT_EQ(roi_values[i][1], bboxes[0].location_data().relative_bounding_box().ymin());
    EXPECT_FLOAT_EQ(roi_values[i][2], bboxes[0].location_data().relative_bounding_box().width());
    EXPECT_FLOAT_EQ(roi_values[i][3], bboxes[0].location_data().relative_bounding_box().height());
  }
}

// One frame, one landmarksList (face), no speaker
TEST(LipTrackCalculatorTest, OnefaceNoSpeaker) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 1));
  int32 scene_num = 1;
  std::vector<int32> gt_output_nums{0};
  SetInputs(kLandmaksValueOneClose, kTimeStampOne, kRoiValueOne, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueOne, runner.get());
}

// One frame, one landmarksList (face), one speaker
TEST(LipTrackCalculatorTest, OneFaceOneSpeaker) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 1));
  int32 scene_num = 1;
  std::vector<int32> gt_output_nums{1};
  SetInputs(kLandmaksValueOneOpen, kTimeStampOne, kRoiValueOne, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueOne, runner.get());
}

// Two frames, two landmarksLists (faces), no speaker (different faces)
TEST(LipTrackCalculatorTest, TwoFacesDiffFace) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 2));
  int32 scene_num = 2;
  std::vector<int32> gt_output_nums{0, 0};
  SetInputs(kLandmaksValueTwoSame, kTimeStampTwo, kRoiValueTwoDiff, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueTwoDiff, runner.get());
}

// Two frames, one landmarksList (face), no speaker (mouth and varance are small)
TEST(LipTrackCalculatorTest, TwoFacesSmallMouth) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 2));
  int32 scene_num = 2;
  std::vector<int32> gt_output_nums{0, 0};
  SetInputs(kLandmaksValueTwoDiff, kTimeStampTwo, kRoiValueTwoSame, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueTwoSame, runner.get());
}

// Two frames, one landmarksList (face), one speaker
TEST(LipTrackCalculatorTest, TwofacesOneSpeaker) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 2, 3000));
  int32 scene_num = 2;
  std::vector<int32> gt_output_nums{1, 1};
  SetInputs(kLandmaksValueTwoSame, kTimeStampTwo, kRoiValueTwoSame, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueTwoSame, runner.get());
}

// Check shot boundary output. Two frames, two landmarksLists (faces),
// two speakers
TEST(LipTrackCalculatorTest, ShotBoundary) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 1));
  int32 scene_num = 2;
  std::vector<int32> gt_output_nums{1, 1};
  SetInputs(kLandmaksValueTwoSame, kTimeStampTwo, kRoiValueTwoDiff, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output_nums, kRoiValueTwoDiff, runner.get());

  const std::vector<Packet>& output_shot_boundary = 
      runner.get()->Outputs().Tag(kOutputShot).packets;
  EXPECT_EQ(output_shot_boundary[0].Get<bool>(), true);
  EXPECT_EQ(output_shot_boundary[1].Get<bool>(), true);
}

// Check min speaker span and close. Two frames, two landmarksLists (faces),
// one speakers
TEST(LipTrackCalculatorTest, SpeakerSpanAndClose) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, 1, 5000));
  int32 scene_num = 2;
  std::vector<int32> gt_output_nums{1, 1};
  SetInputs(kLandmaksValueTwoSame, kTimeStampTwo, kRoiValueTwoDiff, runner.get());
  MP_ASSERT_OK(runner->Run());
  std::vector<std::vector<float>> output{{0.4, 0.1, 0.2, 0.6}, {0.4, 0.1, 0.2, 0.6}};
  CheckOutputs(scene_num, gt_output_nums, output, runner.get());
}

}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

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
constexpr char kInputROI[] = "ROIS_FROM_LANDMARKS";
constexpr char kOutputROI[] = "ROIS";

const int32 kImagewidth = 800; 
const int32 kImageheight = 600;
const int32 kFaceMeshLandmarks = 468;

// Lip contour landmarks.
const std::vector<int32> kLandmarksIdx{78, 308, 82, 13, 312, 87, 14, 317};
// x,y,z of 6 landmarks
const std::map< int32, std::vector<float> > kLandmaksValueTrivial{
  {78, {0,0,0}}, 
  {308, {0,0,0}}, 
  {82, {0,0,0}}, 
  {13, {0,0,0}},
  {312, {0,0,0}}, 
  {87, {0,0,0}}, 
  {14, {0,0,0}}, 
  {317, {0,0,0}}
  };
const std::vector<float> kRoiValueTrivial{0.5, 0.4, 0.2, 0.6, 0.0};


constexpr char kConfig[] = R"(
    calculator: "LipTrackCalculator"
    input_stream: "VIDEO:input_video"
    input_stream: "LANDMARKS:multi_face_landmarks"
    input_stream: "ROIS_FROM_LANDMARKS:face_rects_from_landmarks"
    output_stream: "ROIS:active_speakers_rects"
    options: {
      [mediapipe.autoflip.LipTrackCalculatorOptions.ext]: {
        frame_history: 1
        iou_threshold: 0.5
        lip_mean_threshold: 0.3
        lip_variance_threshold: 0.3
      }
    })";

NormalizedLandmark CreateLandmark(const float x, const float y, const float z) {
  NormalizedLandmark landmark;
  landmark.set_x(x);
  landmark.set_y(y);
  landmark.set_z(z);
  return landmark;
}

void CreateLandmarkList(const std::map< int32, std::vector<float> >& values, NormalizedLandmarkList* list) {
  for (int i = 0; i < kFaceMeshLandmarks; ++i) 
    *list->add_landmark() = CreateLandmark(0.0f, 0.0f, 0.0f);

  // TODO There is error here. Need to fix it.
  // for (auto& idx : kLandmarksIdx){
  //   list->landmark(idx).set_x(values[idx][0]);
  //   // list->landmark(idx)->set_y(values[idx][1]);
  //   // list->landmark(idx)->set_z(values[idx][2]);
  // }
}

void CreateRoi(const std::vector<float>& values, NormalizedRect* roi) {
  roi->set_x_center(values[0]);
  roi->set_y_center(values[1]);
  roi->set_width(values[2]);
  roi->set_height(values[3]);
  roi->set_rotation(values[4]);
}

CalculatorGraphConfig::Node MakeConfig(const std::string base_config) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  return config;
}

void SetInputs(const int32 landmark_num, const std::map< int32, std::vector<float> >& landmark_value, 
          const int32 roi_num, const std::vector<float>& roi_value, CalculatorRunner* runner) {
  // Setup video
  auto input_frame =
    ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, kImagewidth, kImageheight);
  runner->MutableInputs()->Tag(kInputVideo).packets.push_back(
    Adopt(input_frame.release()).At(Timestamp::PostStream()));

  // Setup landmarks
  auto vec_landmarks_list = absl::make_unique<std::vector<NormalizedLandmarkList>>();
  for (int i = 0; i < landmark_num; ++i) {
    NormalizedLandmarkList landmarks_list;
    CreateLandmarkList(landmark_value, &landmarks_list);
    vec_landmarks_list->push_back(landmarks_list);
  }
  runner->MutableInputs()->Tag(kInputLandmark).packets.push_back(
      Adopt(vec_landmarks_list.release()).At(Timestamp::PostStream()));

  // Setup ROIS
  auto vec_roi = absl::make_unique<std::vector<NormalizedRect>>();
  for (int i = 0; i < roi_num; ++i) {
    NormalizedRect roi;
    CreateRoi(roi_value, &roi);
    vec_roi->push_back(roi);
  }
  runner->MutableInputs()->Tag(kInputROI).packets.push_back(
      Adopt(vec_roi.release()).At(Timestamp::PostStream()));
}


void CheckOutputs(const int32 gt_output_num, const std::vector<float>& roi_value, CalculatorRunner* runner) {
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputROI).packets;
  ASSERT_EQ(1, output_packets.size());
  
  const auto& bboxes = output_packets[0].Get<std::vector<NormalizedRect>>();
  ASSERT_EQ(gt_output_num, bboxes.size());
  for (auto& bbox : bboxes) {
    ASSERT_EQ(roi_value[0], bbox.x_center());
    ASSERT_EQ(roi_value[1], bbox.y_center());
    ASSERT_EQ(roi_value[2], bbox.width());
    ASSERT_EQ(roi_value[3], bbox.height());
    ASSERT_EQ(roi_value[4], bbox.rotation());
  }
}

// One landmarksList, all the landmarks' value and ROIs' value are the same.
TEST(LipTrackCalculatorTest, SameOneLandmarkList) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig));
  int32 landmark_num = 1, roi_num = 1, gt_output_num = 0;
  SetInputs(landmark_num, kLandmaksValueTrivial, roi_num, kRoiValueTrivial, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(gt_output_num, kRoiValueTrivial, runner.get());
}


}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

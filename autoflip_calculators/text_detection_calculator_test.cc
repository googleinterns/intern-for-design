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
#include "mediapipe/examples/desktop/autoflip/calculators/text_detection_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"
#include "mediapipe/framework/port/parse_text_proto.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_matchers.h"
#include "mediapipe/framework/port/opencv_core_inc.h"
#include "mediapipe/framework/port/opencv_imgproc_inc.h"
#include "mediapipe/framework/port/opencv_dnn_inc.h"

using mediapipe::Detection;

namespace mediapipe {
namespace autoflip {
namespace {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kOutputRegion[] = "REGIONS";
const int kImagewidth = 800;
const int kImageheight = 600;

const char kConfig[] = R"(
    calculator: "TextDetectionCalculator"
    input_stream: "VIDEO:frames"
    output_stream: "REGIONS:regions"
    )";

const char kConfigNoVideo[] = R"(
    calculator: "TextDetectionCalculator"
    output_stream: "REGIONS:regions"
    )";


void SetInputs(const bool include_video, std::vector<cv::Point2f>& top_left_corners,
               const std::vector<std::string> text_labels, CalculatorRunner* runner) {
  // Setup an input video frame.
  ASSERT_EQ(top_left_corners.size(), text_labels.size());
  if (include_video) {
    auto input_frame =
        ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, kImagewidth, kImageheight);
    cv::Mat frame = mediapipe::formats::MatView(input_frame.get());
    for (int i = 0; i < top_left_corners.size(); ++i) {
      cv::Point2f top_left_corner = top_left_corners[i];
      top_left_corner.x *= kImagewidth;
      top_left_corner.y *= kImageheight;
      std::string text_label = text_labels[i];
      cv::putText(frame, text_label, top_left_corner, cv::FONT_HERSHEY_SIMPLEX, 0.5, cv::Scalar(0, 0, 255));
    }
    runner->MutableInputs()->Tag(kInputVideo).packets.push_back(
        Adopt(input_frame.release()).At(Timestamp::PostStream()));
  }
}

CalculatorGraphConfig::Node MakeConfig(std::string base_config, bool use_visual_scorer) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  config.mutable_options()
      ->MutableExtension(TextDetectionCalculatorOptions::ext)
      ->set_use_visual_scorer(use_visual_scorer);
  config.mutable_options()
      ->MutableExtension(TextDetectionCalculatorOptions::ext)
      ->set_model_path("/usr/local/google/home/zzhencchen/mediapipe/mediapipe/models/frozen_east_text_detection.pb");
  return config;
}

TEST(TextDetectionCalculatorTest, OnePositionText) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, true));
  std::vector<cv::Point2f> top_left_corners{cv::Point2f(0.5, 0.5)};
  std::vector<std::string> text_labels{"TextDetection"};
  SetInputs(true, top_left_corners, text_labels, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  LOG(ERROR) << "Detection size is "<< regions.detections().size();
  ASSERT_EQ(1, regions.detections().size());
  auto text_1 = regions.detections(0);
  EXPECT_EQ(text_1.signal_type().standard(), SignalType::TEXT);
  LOG(ERROR) << "location normalized x is "<< text_1.location_normalized().x();
  LOG(ERROR) << "location normalized y is "<< text_1.location_normalized().y();
  EXPECT_FLOAT_EQ(abs(text_1.location_normalized().x()-top_left_corners[0].x) < 0.05, true);
  EXPECT_FLOAT_EQ(abs(text_1.location_normalized().y()-top_left_corners[0].y) < 0.05, true);

  // EXPECT_FLOAT_EQ(text_1.location_normalized().width(), 0.12125);
  // EXPECT_FLOAT_EQ(text_1.location_normalized().height(), 0.33333);
  // EXPECT_FLOAT_EQ(text_1.score(), 0.040214583);

}

TEST(TextDetectionCalculatorTest, NoText) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, true));
  std::vector<cv::Point2f> top_left_corners;
  std::vector<std::string> text_labels;
  SetInputs(true, top_left_corners, text_labels, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  LOG(ERROR) << "Output packets size is "<< output_packets.size();
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(0, regions.detections().size());
}

TEST(TextDetectionCalculatorTest, TwoPositionText) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, true));
  std::vector<cv::Point2f> top_left_corners{cv::Point2f(0.4, 0.7), cv::Point2f(0.8, 0.1)};
  std::vector<std::string> text_labels{"texttext", "DETECTIONDETECTION"};
  SetInputs(true, top_left_corners, text_labels, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  LOG(ERROR) << "Detection size is "<< regions.detections().size();
  ASSERT_EQ(2, regions.detections().size());
  auto text_1 = regions.detections(0);
  EXPECT_EQ(text_1.signal_type().standard(), SignalType::TEXT);
  LOG(ERROR) << "location normalized x is "<< text_1.location_normalized().x();
  LOG(ERROR) << "location normalized y is "<< text_1.location_normalized().y();
  EXPECT_FLOAT_EQ(abs(text_1.location_normalized().x()-top_left_corners[0].x) < 0.05, true);
  EXPECT_FLOAT_EQ(abs(text_1.location_normalized().y()-top_left_corners[0].y) < 0.05, true);

  auto text_2 = regions.detections(1);
  EXPECT_EQ(text_2.signal_type().standard(), SignalType::TEXT);
  LOG(ERROR) << "location normalized x is "<< text_2.location_normalized().x();
  LOG(ERROR) << "location normalized y is "<< text_2.location_normalized().y();
  EXPECT_FLOAT_EQ(abs(text_2.location_normalized().x()-top_left_corners[1].x) < 0.05, true);
  EXPECT_FLOAT_EQ(abs(text_2.location_normalized().y()-top_left_corners[1].y) < 0.05, true);

}


}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

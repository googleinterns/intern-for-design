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

const char kConfig[] = R"(
    calculator: "TextDetectionCalculator"
    input_stream: "VIDEO:frames"
    output_stream: "REGIONS:regions"
    )";

const char kConfigNoVideo[] = R"(
    calculator: "TextDetectionCalculator"
    output_stream: "REGIONS:regions"
    )";


void SetInputs(const bool include_video, const cv::Point2f top_left_corner,
               const std::string text_label, const CalculatorRunner* runner) {
  // Setup an input video frame.
  if (include_video) {
    auto input_frame =
        ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, 800, 600);
    top_left_corner.x *= 800;
    top_left_corner.y *= 600;
    for (auto& frame : input_frame){
      putText(frame, text_label, top_left_corner, FONT_HERSHEY_SIMPLEX, 0.8, Scalar(0, 0, 255));
    }
    runner->MutableInputs()->Tag("VIDEO").packets.push_back(
        Adopt(input_frame.release()).At(Timestamp::PostStream()));
  }
}

CalculatorGraphConfig::Node MakeConfig(std::string base_config, bool text_bounding_box,
                                       bool visual_scoring) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  config.mutable_options()
      ->MutableExtension(TextDetectionCalculatorOptions::ext)
      ->set_export_text_bounding_box(text_bounding_box);
  config.mutable_options()
      ->MutableExtension(TextDetectionCalculatorOptions::ext)
      ->set_use_visual_scorer(visual_scoring);

  return config;
}

TEST(TextDetectionCalculatorTest, OnePositionText) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, true, true, true));
  cv::Point2f top_left_corner(0.5, 0.5);
  std::string text_label = "This is a test for text detection.";
  SetInputs(true, top_left_corner, text_label, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag("REGIONS").packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto text_1 = regions.detections(0);
  EXPECT_EQ(text_1.signal_type().standard(), SignalType::TEXT);
  EXPECT_FLOAT_EQ(text_1.location_normalized().x(), 0.5);
  EXPECT_FLOAT_EQ(text_1.location_normalized().y(), 0.5);
  // EXPECT_FLOAT_EQ(text_1.location_normalized().width(), 0.12125);
  // EXPECT_FLOAT_EQ(text_1.location_normalized().height(), 0.33333);
  // EXPECT_FLOAT_EQ(text_1.score(), 0.040214583);

}


}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

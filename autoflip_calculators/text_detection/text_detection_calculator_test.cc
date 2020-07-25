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
#include "mediapipe/framework/port/opencv_highgui_inc.h"
#include "mediapipe/framework/port/opencv_video_inc.h"


using mediapipe::Detection;

namespace mediapipe {
namespace autoflip {
namespace {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kOutputRegion[] = "REGIONS";
const int kImagewidth = 800;
const int kImageheight = 600;

const cv::Scalar kFontColor(0, 255, 0);
const float kFontScale = 1.0;
const float kFontScaleSmall = 0.1;
const float kFontScaleLarge = 4.0;

const std::vector<cv::Point2f> kTopLeftCornersOne{cv::Point2f(0.5, 0.5)};
const std::vector<std::string> kTextLabelsOne{"AutoFlip"};
const std::vector<cv::Point2f> kTopLeftCornersTwo{cv::Point2f(0.4, 0.7), cv::Point2f(0.8, 0.1)};
const std::vector<std::string> kTextLabelsTwo{"textdetection", "TEXTDETECTION"};

const std::string kModelPath = "/usr/local/google/home/zzhencchen/mediapipe/mediapipe/models/frozen_east_text_detection.pb";

constexpr char kConfig[] = R"(
    calculator: "TextDetectionCalculator"
    input_stream: "VIDEO:frames"
    output_stream: "REGIONS:regions"
    options: {
      [mediapipe.autoflip.TextDetectionCalculatorOptions.ext]: {
        use_visual_scorer: true
        confidence_threshold: 0.5
        nms_threshold: 0.4
        east_width: 160
        east_height: 160
      }
    })";

CalculatorGraphConfig::Node MakeConfig(const std::string base_config,
                                      const std::string model_path) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  config.mutable_options()
      ->MutableExtension(TextDetectionCalculatorOptions::ext)
      ->set_model_path(model_path);

  return config;
}

void SetInputs(const std::vector<cv::Point2f>& top_left_corners,
              const std::vector<std::string>& text_labels, const float font_scale,
              const cv::Scalar font_color, CalculatorRunner* runner) {
  // Setup an input video frame.
  ASSERT_EQ(top_left_corners.size(), text_labels.size());
  auto input_frame =
      ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, kImagewidth, kImageheight);
  cv::Mat frame = mediapipe::formats::MatView(input_frame.get());
  for (int i = 0; i < top_left_corners.size(); ++i) {
    cv::Point2f top_left_corner = top_left_corners[i];
    top_left_corner.x *= kImagewidth;
    top_left_corner.y *= kImageheight;
    cv::putText(frame, text_labels[i], top_left_corner, cv::FONT_HERSHEY_SIMPLEX, font_scale, font_color);
  }
  runner->MutableInputs()->Tag(kInputVideo).packets.push_back(
      Adopt(input_frame.release()).At(Timestamp::PostStream()));
}


void CheckOutputs(const std::vector<cv::Point2f>& top_left_corners,
              const std::vector<std::string>& text_labels, CalculatorRunner* runner) {

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  EXPECT_EQ(text_labels.size() <= regions.detections().size(), true);
  for (auto& text : regions.detections())
    EXPECT_EQ(text.signal_type().standard(), SignalType::TEXT);
}

// Checks that calculator works when there is no model path.
TEST(TextDetectionCalculatorTest, NoModelPath) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, ""));
  SetInputs(kTopLeftCornersOne, kTextLabelsOne, kFontScale, kFontColor, runner.get());
  ASSERT_FALSE(runner->Run().ok());
}

// Checks that calculator works when model path is wrong.
TEST(TextDetectionCalculatorTest, WrongModelPath) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, "wrong/path/model.pb"));
  SetInputs(kTopLeftCornersOne, kTextLabelsOne, kFontScale, kFontColor, runner.get());
  ASSERT_FALSE(runner->Run().ok());
}

// Checks that calculator works when there is one text.
TEST(TextDetectionCalculatorTest, OneText) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, kModelPath));
  SetInputs(kTopLeftCornersOne, kTextLabelsOne, kFontScale, kFontColor, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kTopLeftCornersOne, kTextLabelsOne, runner.get());
}

// Checks that calculator works when there is no text.
TEST(TextDetectionCalculatorTest, NoText) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, kModelPath));
  std::vector<cv::Point2f> empty_result_corners;
  std::vector<std::string> empty_text_labels;
  SetInputs(empty_result_corners, empty_text_labels, kFontScale, kFontColor, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(empty_result_corners, empty_text_labels, runner.get());
}

// Checks that calculator works when there are two texts.
TEST(TextDetectionCalculatorTest, TwoTexts) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, kModelPath));
  SetInputs(kTopLeftCornersTwo, kTextLabelsTwo, kFontScale, kFontColor, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kTopLeftCornersTwo, kTextLabelsTwo, runner.get());
}

// Checks that calculator works when the text is small.
TEST(TextDetectionCalculatorTest, SmallText) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, kModelPath));
  SetInputs(kTopLeftCornersOne, kTextLabelsOne, kFontScaleSmall, kFontColor, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kTopLeftCornersOne, kTextLabelsOne, runner.get());
}

// Checks that calculator works when the text is large.
TEST(TextDetectionCalculatorTest, LargeText) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfig, kModelPath));
  SetInputs(kTopLeftCornersOne, kTextLabelsOne, kFontScaleLarge, kFontColor, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kTopLeftCornersOne, kTextLabelsOne, runner.get());
}

}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

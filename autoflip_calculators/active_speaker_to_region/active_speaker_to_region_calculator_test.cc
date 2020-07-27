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
#include "mediapipe/examples/desktop/autoflip/calculators/active_speaker_to_region_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/rect.pb.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"
#include "mediapipe/framework/port/parse_text_proto.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_matchers.h"

#include <cmath>

using mediapipe::Detection;

namespace mediapipe {
namespace autoflip {
namespace {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kInputRois[] = "ROIS";
constexpr char kOutputRegion[] = "REGIONS";
const int kImagewidth = 800;
const int kImageheight = 600;

// ROI values
const std::vector<std::vector<float>> kRoiValueOne{{0.5, 0.4, 0.2, 0.6, 0.0}};
const std::vector<std::vector<float>> kRoiValueOneOutside{{0.1, 0.2, 0.3, 0.6, 0.0}};
const std::vector<std::vector<float>> kRoiValueOneEdge{{0.1, 0.2, 0.2, 0.4, 0.0}};
const std::vector<std::vector<float>> kRoiValueTwo{{0.25, 0.95, 0.5, 0.1, 0.0}, {0.8, 0.9, 0.5, 0.4, 0.0}};
const std::vector<std::vector<float>> kRoiValueTwoRotate{{0.9, 0.9, 0.2, 0.4, 1/4.0}, {0.1, 0.2, 0.6, 0.4, -1/4.0}};

const char kConfig[] = R"(
    calculator: "ActiveSpeakerToRegionCalculator"
    input_stream: "VIDEO:frames"
    input_stream: "ROIS:normalized_speakers"
    output_stream: "REGIONS:regions"
    )";

const char kConfigNoVideo[] = R"(
    calculator: "ActiveSpeakerToRegionCalculator"
    input_stream: "ROIS:normalized_speakers"
    output_stream: "REGIONS:regions"
    )";

void SetInputs(const std::vector<std::vector<float>>& rois, const bool include_video,
               CalculatorRunner* runner) {
  // Setup an input video frame.
  if (include_video) {
    auto input_frame =
        ::absl::make_unique<ImageFrame>(ImageFormat::SRGB, kImagewidth, kImageheight);
    runner->MutableInputs()->Tag(kInputVideo).packets.push_back(
        Adopt(input_frame.release()).At(Timestamp::PostStream()));
  }
  // Setup two faces as input.
  auto input_rois = ::absl::make_unique<std::vector<NormalizedRect>>();
  // A face with landmarks.
  for (const auto& roi : rois) {
    NormalizedRect rect;
    rect.set_x_center(roi[0]);
    rect.set_y_center(roi[1]);
    rect.set_width(roi[2]);
    rect.set_height(roi[3]);
    rect.set_rotation(roi[4]);
    input_rois->push_back(rect);
  }
  runner->MutableInputs()->Tag(kInputRois).packets.push_back(
      Adopt(input_rois.release()).At(Timestamp::PostStream()));
}

CalculatorGraphConfig::Node MakeConfig(std::string base_config, bool visual_scoring) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
  config.mutable_options()
      ->MutableExtension(ActiveSpeakerToRegionCalculatorOptions::ext)
      ->set_use_visual_scorer(visual_scoring);

  return config;
}

// No video not use visual_scoring
TEST(ActiveSpeakerToRegionCalculatorTest, NoVideoNoVisualScore) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfigNoVideo, false));
  SetInputs(kRoiValueOne, false, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto& speaker = regions.detections(0);
  EXPECT_EQ(speaker.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker.location_normalized().x(), 0.4);
  EXPECT_FLOAT_EQ(speaker.location_normalized().y(), 0.099999964);
  EXPECT_FLOAT_EQ(speaker.location_normalized().width(), 0.2);
  EXPECT_FLOAT_EQ(speaker.location_normalized().height(), 0.6);
  EXPECT_FLOAT_EQ(speaker.score(), 1.0);
}

// No video use visual_scoring
TEST(ActiveSpeakerToRegionCalculatorTest, NoVideoWithVisualScore) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfigNoVideo, true));
  SetInputs(kRoiValueOne, false, runner.get());

  // Run the calculator.
  ASSERT_FALSE(runner->Run().ok());
}

// One speaker, visual_scoring
TEST(ActiveSpeakerToRegionCalculatorTest, OneSpeaker) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, true));
  SetInputs(kRoiValueOne, true, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto& speaker = regions.detections(0);
  EXPECT_EQ(speaker.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker.location_normalized().x(), 0.4);
  EXPECT_FLOAT_EQ(speaker.location_normalized().y(), 0.1);
  EXPECT_FLOAT_EQ(speaker.location_normalized().width(), 0.2);
  EXPECT_FLOAT_EQ(speaker.location_normalized().height(), 0.6);
  EXPECT_FLOAT_EQ(speaker.score(), 0.12);
}

// One speaker, no visual_scoring
TEST(ActiveSpeakerToRegionCalculatorTest, OneSpeakerNoVisualScore) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, false));
  SetInputs(kRoiValueOne, true, runner.get());

  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto& speaker = regions.detections(0);
  EXPECT_EQ(speaker.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker.location_normalized().x(), 0.4);
  EXPECT_FLOAT_EQ(speaker.location_normalized().y(), 0.1);
  EXPECT_FLOAT_EQ(speaker.location_normalized().width(), 0.2);
  EXPECT_FLOAT_EQ(speaker.location_normalized().height(), 0.6);
  EXPECT_FLOAT_EQ(speaker.score(), 1.0);
}

// One speaker, region is outside
TEST(ActiveSpeakerToRegionCalculatorTest, OneSpeakerOutside) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, false));
  SetInputs(kRoiValueOneOutside, true, runner.get());
  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto& speaker = regions.detections(0);
  EXPECT_EQ(speaker.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker.location_normalized().x(), 0);
  EXPECT_FLOAT_EQ(speaker.location_normalized().y(), 0);
  EXPECT_FLOAT_EQ(speaker.location_normalized().width(), 0.25);
  EXPECT_FLOAT_EQ(speaker.location_normalized().height(), 0.5);
}

// One speaker, region is on the edge
TEST(ActiveSpeakerToRegionCalculatorTest, OneSpeakerEdge) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, false));
  SetInputs(kRoiValueOneEdge, true, runner.get());
  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(1, regions.detections().size());
  auto& speaker = regions.detections(0);
  EXPECT_EQ(speaker.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker.location_normalized().x(), 0);
  EXPECT_FLOAT_EQ(speaker.location_normalized().y(), 0);
  EXPECT_FLOAT_EQ(speaker.location_normalized().width(), 0.2);
  EXPECT_FLOAT_EQ(speaker.location_normalized().height(), 0.4);
}

// Two speakers
TEST(ActiveSpeakerToRegionCalculatorTest, TwoSpeakers) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, false));
  SetInputs(kRoiValueTwo, true, runner.get());
  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(2, regions.detections().size());
  auto& speaker_1 = regions.detections(0);
  EXPECT_EQ(speaker_1.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().x(), 0);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().y(), 0.9);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().width(), 0.5);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().height(), 0.1);

  auto& speaker_2 = regions.detections(1);
  EXPECT_EQ(speaker_2.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().x(), 0.55);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().y(), 0.7);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().width(), 0.45);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().height(), 0.3);
}

// Two speakers with rotated
TEST(ActiveSpeakerToRegionCalculatorTest, TwoSpeakersRotated) {
  // Setup test
  auto runner = ::absl::make_unique<CalculatorRunner>(
      MakeConfig(kConfig, false));
  SetInputs(kRoiValueTwoRotate, true, runner.get());
  // Run the calculator.
  MP_ASSERT_OK(runner->Run());

  // Check the output regions.
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputRegion).packets;
  ASSERT_EQ(1, output_packets.size());

  const auto& regions = output_packets[0].Get<DetectionSet>();
  ASSERT_EQ(2, regions.detections().size());
  auto& speaker_1 = regions.detections(0);
  EXPECT_EQ(speaker_1.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().x(), 0.75);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().y(), 0.76666665);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().width(), 0.25);
  EXPECT_FLOAT_EQ(speaker_1.location_normalized().height(), 0.23333335);

  auto& speaker_2 = regions.detections(1);
  EXPECT_EQ(speaker_2.signal_type().standard(), SignalType::FACE_FULL);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().x(), 0);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().y(), 0);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().width(), 0.25);
  EXPECT_FLOAT_EQ(speaker_2.location_normalized().height(), 0.6);
}

}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

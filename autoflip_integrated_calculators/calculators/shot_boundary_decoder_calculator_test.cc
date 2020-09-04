// Copyright 2018 The MediaPipe Authors.
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

#include "absl/memory/memory.h"
#include "mediapipe/examples/desktop/autoflip/calculators/shot_boundary_decoder_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"

namespace mediapipe {
namespace autoflip {

namespace {

constexpr char kInputPrediction[] = "PREDICTION";
constexpr char kInputTimestamp[] = "TIME";
constexpr char kOutputShotChange[] = "IS_SHOT_CHANGE";

const float kNoBoundary = -5.0;
const float KBoundary = 0.5;
const std::vector<int> kBoundaryPositionOne{0};
const std::vector<int> kBoundaryPositionTwo{6, 25};
const std::vector<int> kBoundaryPositionThree{12, 36, 40};
const int kBufferSize = 100;
const int kNumOfPadding = 25;
const int kFramesPerProcess = 50;
const int kNumOfOutput = 49;

class ShotBoundaryDecoderCalculatorTest : public ::testing::Test {
 protected:
  void SetupCalculator(bool output_only_on_change) {
    CalculatorGraphConfig::Node config;
    config.set_calculator("ShotBoundaryDecoderCalculator");
    config.add_input_stream("PREDICTION:prediction_vector");
    config.add_input_stream("TIME:time_stamp");
    config.add_output_stream("IS_SHOT_CHANGE:is_shot");
    config.mutable_options()
      ->MutableExtension(ShotBoundaryDecoderCalculatorOptions::ext)
      ->set_output_only_on_change(output_only_on_change);
    runner_ = ::absl::make_unique<CalculatorRunner>(config);
  }
  std::unique_ptr<CalculatorRunner> runner_;
};

void SetupInputs(const std::vector<int>& kBoundaryPosition, 
                                CalculatorRunner* runner) {
  auto input_value = ::absl::make_unique<std::vector<float>>();
  auto input_time = ::absl::make_unique<std::vector<Timestamp>>();

  // Setup input value
  for (int i = 0; i < kBufferSize; ++i)
    input_value->push_back(kNoBoundary);
  for (auto position : kBoundaryPosition)
    (*input_value)[kNumOfPadding+position] = KBoundary;
    
  // Setup input timestamp
  for (int i = 0; i < kBufferSize; ++i) {
    if (i < kNumOfPadding)
      input_time->push_back(Timestamp(0));
    else if (i < kFramesPerProcess + kNumOfPadding)
      input_time->push_back(Timestamp(i-kNumOfPadding));
    else
      input_time->push_back(Timestamp::Done());
  }

  runner->MutableInputs()->Tag(kInputPrediction).packets.push_back(
        Adopt(input_value.release()).At(Timestamp(0)));
  runner->MutableInputs()->Tag(kInputTimestamp).packets.push_back(
        Adopt(input_time.release()).At(Timestamp(0)));
}

void CheckOutputs(const std::vector<int>& kBoundaryPosition, 
        const int32 num_output, CalculatorRunner* runner) {
  const std::vector<Packet>& output_packets =
      runner->Outputs().Tag(kOutputShotChange).packets;
  ASSERT_EQ(num_output, output_packets.size());

  int count = 0;
  for (int i = 0; i < num_output; ++i) {
    auto is_boundary = output_packets[i].Get<bool>();
    auto time = output_packets[i].Timestamp();
    if (is_boundary) {
      auto input_time = kBoundaryPosition[count++];
      EXPECT_EQ(time, Timestamp(input_time+1));
    }
  }
}

TEST_F(ShotBoundaryDecoderCalculatorTest, NoBoundary) {
  SetupCalculator(false);
  std::vector<int> no_boundary;
  SetupInputs(no_boundary, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  CheckOutputs(no_boundary, kNumOfOutput, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, OneBoundary) {
  SetupCalculator(false);
  SetupInputs(kBoundaryPositionOne, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  CheckOutputs(kBoundaryPositionOne, kNumOfOutput, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, TwoBoundaries) {
  SetupCalculator(false);
  SetupInputs(kBoundaryPositionTwo, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  CheckOutputs(kBoundaryPositionTwo, kNumOfOutput, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, ThreeBoundaries) {
  SetupCalculator(false);
  SetupInputs(kBoundaryPositionThree, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  CheckOutputs(kBoundaryPositionThree, kNumOfOutput, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, NoBoundaryOutputOnlyOnChange) {
  SetupCalculator(true);
  std::vector<int> no_boundary;
  SetupInputs(no_boundary, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  int num_output = 0;
  CheckOutputs(no_boundary, num_output, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, OneBoundaryOutputOnlyOnChange) {
  SetupCalculator(true);
  SetupInputs(kBoundaryPositionOne, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  int num_output = 1;
  CheckOutputs(kBoundaryPositionOne, num_output, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, TwoBoundariesOutputOnlyOnChange) {
  SetupCalculator(true);
  SetupInputs(kBoundaryPositionTwo, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  int num_output = 2;
  CheckOutputs(kBoundaryPositionTwo, num_output, runner_.get());
}

TEST_F(ShotBoundaryDecoderCalculatorTest, ThreeBoundariesOutputOnlyOnChange) {
  SetupCalculator(true);
  SetupInputs(kBoundaryPositionThree, runner_.get());
  ASSERT_TRUE(runner_->Run().ok());
  int num_output = 3;
  CheckOutputs(kBoundaryPositionThree, num_output, runner_.get());
}


}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

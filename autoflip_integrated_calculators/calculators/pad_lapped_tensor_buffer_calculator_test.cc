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
#include "mediapipe/examples/desktop/autoflip/calculators/pad_lapped_tensor_buffer_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"
#include "tensorflow/core/framework/tensor.h"
#include "tensorflow/core/framework/tensor_shape.h"
#include "tensorflow/core/framework/types.pb.h"

namespace mediapipe {

namespace {

const int kNumOfPadding = 25;
const int kFramesPerProcess = 50;

namespace tf = ::tensorflow;

class PadLappedTensorBufferCalculatorTest : public ::testing::Test {
 protected:
  void SetUpCalculator() {
    CalculatorGraphConfig::Node config;
    config.set_calculator("PadLappedTensorBufferCalculator");
    config.add_input_stream("input_tensor");
    config.add_output_stream("output_tensor");
    config.add_output_stream("output_timestamp");
    auto options = config.mutable_options()->MutableExtension(
        PadLappedTensorBufferCalculatorOptions::ext);
    runner_ = ::absl::make_unique<CalculatorRunner>(config);
  }
  std::unique_ptr<CalculatorRunner> runner_;
};

void SetupInputs(const int num_timesteps, CalculatorRunner* runner) {
    for (int i = 0; i < num_timesteps; ++i) {
    auto input = ::absl::make_unique<tensorflow::Tensor>(
        tensorflow::DT_FLOAT, tensorflow::TensorShape({1}));
    input->tensor<float, 1>()(0) = i;
    runner->MutableInputs()->Index(0).packets.push_back(
        Adopt(input.release()).At(Timestamp(i)));
  }
}

void CheckOutputs(const int32 num_output, CalculatorRunner* runner) {
  const std::vector<Packet>& output_tensor_packets =
      runner->Outputs().Index(0).packets;
  const std::vector<Packet>& output_timestamp_packets =
      runner->Outputs().Index(1).packets;
  ASSERT_EQ(num_output, output_tensor_packets.size());
  ASSERT_EQ(num_output, output_timestamp_packets.size());
  for (int i = 0; i < num_output; ++i) {
    auto time = output_timestamp_packets[i].Get<std::vector<Timestamp>>();
    for (int j = 0; j < kFramesPerProcess; ++j) {
      int position = j + kNumOfPadding;
      if (time[position] == Timestamp::Done())
        break;
      float value = output_tensor_packets[i].Get<tf::Tensor>().tensor<float, 2>()(position, 0);
      ASSERT_NEAR(i*kFramesPerProcess+j, value, 0.0001);
      EXPECT_EQ(time[position], Timestamp(i*kFramesPerProcess+j));
    }
  }
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToOne) {
  SetUpCalculator();
  int num_timesteps = 50;
  int num_output = num_timesteps / kFramesPerProcess 
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToTwo) {
  SetUpCalculator();
  int num_timesteps = 100;
  int num_output = num_timesteps / kFramesPerProcess 
        + (num_timesteps % kFramesPerProcess != 0);
  
  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToThree) {
  SetUpCalculator();
  int num_timesteps = 150;
  int num_output = num_timesteps / kFramesPerProcess
        + (num_timesteps % kFramesPerProcess != 0);
  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneFrame) {
  SetUpCalculator();
  int num_timesteps = 1;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, ZeroFrame) {
  SetUpCalculator();
  int num_timesteps = 0;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToOneWithRemainder) {
  SetUpCalculator();
  int num_timesteps = 32;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToTwoWithRemainderSmall) {
  SetUpCalculator();
  int num_timesteps = 51;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, OneToTwoWithRemainderLarge) {
  SetUpCalculator();
  int num_timesteps = 99;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

TEST_F(PadLappedTensorBufferCalculatorTest, LargeInput) {
  SetUpCalculator();
  int num_timesteps = 999;
  int num_output = num_timesteps / kFramesPerProcess
      + (num_timesteps % kFramesPerProcess != 0);

  SetupInputs(num_timesteps, runner_.get());

  ASSERT_TRUE(runner_->Run().ok());

  CheckOutputs(num_output, runner_.get());
}

}  // namespace
}  // namespace mediapipe

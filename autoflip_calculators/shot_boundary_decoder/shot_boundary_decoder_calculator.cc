// Copyright 2020 The MediaPipe Authors.
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

#include <vector>
#include <cmath>

#include "mediapipe/examples/desktop/autoflip/calculators/shot_boundary_decoder_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/timestamp.h"

// IO labels.
constexpr char kInputPrediction[] = "PREDICTION";
constexpr char kInputTimestamp[] = "TIME";
constexpr char kOutputShotChange[] = "IS_SHOT_CHANGE";

const int kPredictionBegin = 25;
const int kPredictionEnd = 75;
const int kInputSize = 100;

namespace mediapipe {
namespace autoflip {

// This calculator decodes the output of TransNetV2 and output the shot
// change. Settings to control the shot change logic are presented in the
// options proto.
// 
// The details of TransNetV2: https://github.com/soCzech/TransNetV2. 
//
// Example config:
// node {
//   calculator: "ShotBoundaryDecoderCalculator"
//   input_stream: "PREDICTION:prediction_vector"
//   input_stream: "TIME:time_stamp"
//   output_stream: "IS_SHOT_CHANGE:is_shot"
//   options {
//     [mediapipe.ShotBoundaryDecoderCalculatorOptions.ext] {
//       threshold: 0.5
//     }
//   }
// }

class ShotBoundaryDecoderCalculator : public CalculatorBase {
 public:
  static ::mediapipe::Status GetContract(CalculatorContract* cc);

  ::mediapipe::Status Open(CalculatorContext* cc) override;
  ::mediapipe::Status Process(CalculatorContext* cc) override;

 private:
  double Sigmoid(float output);
  // Transmits signal to next calculator.
  void Transmit(mediapipe::CalculatorContext* cc, 
              bool is_shot_change, Timestamp time);

  ShotBoundaryDecoderCalculatorOptions options_;
  // Last time a shot was detected.
  Timestamp last_shot_timestamp_;
};

REGISTER_CALCULATOR(ShotBoundaryDecoderCalculator);

::mediapipe::Status ShotBoundaryDecoderCalculator::GetContract(
    CalculatorContract* cc) {
  cc->Inputs().Tag(kInputPrediction).Set<std::vector<float>>();
  cc->Inputs().Tag(kInputTimestamp).Set<std::vector<Timestamp>>();

  cc->Outputs().Tag(kOutputShotChange).Set<bool>();

  return ::mediapipe::OkStatus();
}

::mediapipe::Status ShotBoundaryDecoderCalculator::Open(CalculatorContext* cc) {
  options_ = cc->Options<ShotBoundaryDecoderCalculatorOptions>();
  last_shot_timestamp_ = Timestamp(0);

  return ::mediapipe::OkStatus();
}

::mediapipe::Status ShotBoundaryDecoderCalculator::Process(
    CalculatorContext* cc) {
  const auto& input_predictions 
    = cc->Inputs().Tag(kInputPrediction).Get<std::vector<float>>();
  const auto& input_timestamps
    = cc->Inputs().Tag(kInputTimestamp).Get<std::vector<Timestamp>>();
  RET_CHECK_EQ(input_predictions.size(), kInputSize)
    << "Input PREDICTION size is not correct.";
  RET_CHECK_EQ(input_timestamps.size(), kInputSize)
    << "Input TIME size is not correct.";  
  
  for (int i = kPredictionBegin; i < kPredictionEnd; ++i) {
    const auto& time = input_timestamps[i];
    const auto& next_time = input_timestamps[i+1];
    // Handle the padding after the video. The timestampd of 
    // the padding frames after the video are the timestamp of
    // the last frame. For the padding detail, please refer
    // pad_lapped_tensor_buffer_calculator.cc Close function. 
    if (next_time == Timestamp::Done())
      break;

    auto prediction =  Sigmoid(input_predictions[i]);
    bool is_shot_change = prediction > options_.threshold();
    Transmit(cc, is_shot_change, next_time);
  }
      

  return ::mediapipe::OkStatus();
}

// The sigmoid function
double ShotBoundaryDecoderCalculator:: Sigmoid(float output) {
  return 1 / (1 + exp(-output));
}

void ShotBoundaryDecoderCalculator::Transmit(mediapipe::CalculatorContext* cc,
        bool is_shot_change, Timestamp time) {
  if ((time - last_shot_timestamp_).Seconds() <
      options_.min_shot_span()) {
    is_shot_change = false;
  }
  if (is_shot_change) {
    LOG(INFO) << "Shot change at: " << time.Seconds()
              << " seconds.";
    cc->Outputs()
        .Tag(kOutputShotChange)
        .AddPacket(Adopt(std::make_unique<bool>(true).release())
                       .At(time));
  } else if (!options_.output_only_on_change()) {
    cc->Outputs()
        .Tag(kOutputShotChange)
        .AddPacket(Adopt(std::make_unique<bool>(false).release())
                       .At(time));
  }
}

}  // namespace autoflip
}  // namespace mediapipe

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

#include <map>
#include <memory>
#include <string>
#include <utility>
#include <vector>

#include "mediapipe/examples/desktop/autoflip/calculators/shot_boundary_visualization_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/port/opencv_imgproc_inc.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/timestamp.h"

using mediapipe::ImageFrame;
using mediapipe::PacketTypeSet;

// IO labels.
constexpr char kInputVideo[] = "VIDEO";
constexpr char kInputShotChange[] = "IS_SHOT_CHANGE";
constexpr char kOutputBoundary[] = "BOUNDARY_INFORMATION_FRAME";

const cv::Scalar kWhite = cv::Scalar(255.0, 255.0, 255.0);  // text
const cv::Scalar kRed = cv::Scalar(255.0, 0.0, 0.0); // state 2
const cv::Scalar kGreen = cv::Scalar(0.0, 255.0, 0.0); // state 1

namespace mediapipe {
namespace autoflip {

// This calculator visualizes the shot boundary signal.
//
// Example:
//  node {
//    calculator: "ShotBoundaryVisualizationCalculator"
//    input_stream: "VIDEO:camera_frames"
//    input_stream: "IS_SHOT_CHANGE:shot_change"
//    output_stream: "BOUNDARY_INFORMATION_FRAME:boundary_information_frames"
//  }
class ShotBoundaryVisualizationCalculator : public mediapipe::CalculatorBase {
 public:
  ShotBoundaryVisualizationCalculator() {}
  ShotBoundaryVisualizationCalculator(const ShotBoundaryVisualizationCalculator&) = delete;
  ShotBoundaryVisualizationCalculator& operator=(const ShotBoundaryVisualizationCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;

 private:
   ::mediapipe::Status DrawBoundaryMarks(cv::Mat* viz_mat);
  // Calculator options.
  // ShotBoundaryVisualizationCalculatorOptions options_;
  int num_boundary_;
  int state_;
  // Dimensions of video frame.
  int frame_width_ = -1;
  int frame_height_ = -1;
  ImageFormat::Format frame_format_ = ImageFormat::UNKNOWN;
};

REGISTER_CALCULATOR(ShotBoundaryVisualizationCalculator);

::mediapipe::Status ShotBoundaryVisualizationCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  cc->Inputs().Tag(kInputVideo).Set<ImageFrame>();
  cc->Inputs().Tag(kInputShotChange).Set<bool>();

  cc->Outputs().Tag(kOutputBoundary).Set<ImageFrame>();
  return ::mediapipe::OkStatus();
}

mediapipe::Status ShotBoundaryVisualizationCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  num_boundary_ = 0;
  state_ = 0;
  return ::mediapipe::OkStatus();
}

::mediapipe::Status ShotBoundaryVisualizationCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  const auto& frame = cc->Inputs().Tag(kInputVideo).Get<ImageFrame>();
  if (frame_width_ < 0) {
    frame_width_ = frame.Width();
    frame_height_ = frame.Height();
    frame_format_ = frame.Format();
  }

  bool is_shot_change = false;
  if (cc->Inputs().HasTag(kInputShotChange) &&
      !cc->Inputs().Tag(kInputShotChange).Value().IsEmpty()) {
    is_shot_change = cc->Inputs().Tag(kInputShotChange).Get<bool>();
  }

  if (is_shot_change) {
    num_boundary_++;
    state_ = ~state_;
  }  

  auto viz_frame = absl::make_unique<ImageFrame>(
    frame_format_, frame_width_, frame_height_);
  cv::Mat viz_mat = formats::MatView(viz_frame.get());
  mediapipe::formats::MatView(&frame).copyTo(viz_mat);
  MP_RETURN_IF_ERROR(DrawBoundaryMarks(&viz_mat));

  cc->Outputs().Tag(kOutputBoundary).Add(viz_frame.release(), cc->InputTimestamp());
  return ::mediapipe::OkStatus();
}

::mediapipe::Status ShotBoundaryVisualizationCalculator::DrawBoundaryMarks(cv::Mat* viz_mat) {
  float text_x = 0.02, text_y = 0.05,
        no_bounday_x = 0.05, no_bounday_y = 0.15,
        bounday_x = 0.05, bounday_y = 0.2;

  std::string text = cv::format("Total number of shot boundary detected: %d.", num_boundary_);
  cv::putText(*viz_mat, text, cv::Point2f(frame_width_*(text_x), frame_height_*(text_y)), 
        cv::FONT_HERSHEY_COMPLEX, 0.8, kWhite);

  if (state_) {
    cv::circle(*viz_mat, cv::Point2f(frame_width_*(bounday_x), frame_height_*(bounday_y)), 
              20, kGreen, CV_FILLED);
  }
  else {
    cv::circle(*viz_mat, cv::Point2f(frame_width_*(no_bounday_x), frame_height_*(no_bounday_y)), 
              20, kRed, CV_FILLED);
  }
  return ::mediapipe::OkStatus();
}


}  // namespace autoflip
}  // namespace mediapipe

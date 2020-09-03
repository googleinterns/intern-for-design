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

#include <algorithm>
#include <memory>

#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/active_speaker_to_region_calculator.pb.h"
#include "mediapipe/examples/desktop/autoflip/quality/visual_scorer.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/rect.pb.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/formats/location_data.pb.h"
#include "mediapipe/framework/port/opencv_core_inc.h"
#include "mediapipe/framework/port/opencv_imgproc_inc.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_builder.h"

namespace mediapipe {
namespace autoflip {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kInputRois[] = "DETECTIONS_SPEAKERS";
constexpr char kOutputRegion[] = "REGIONS";


// This calculator converts detected active speaker to SalientRegion protos that can be
// used for downstream processing. Each SalientRegion is scored using image
// cues. Scoring can be controlled through
// ActiveSpeakerToRegionCalculator::scorer_options.
// Example:
//    calculator: "ActiveSpeakerToRegionCalculator"
//    input_stream: "VIDEO:frames"
//    input_stream: "DETECTIONS_SPEAKERS:active_speakers_detections"
//    output_stream: "REGIONS:regions"
//    options:{
//      [mediapipe.autoflip.ActiveSpeakerToRegionCalculatorOptions.ext]:{
//        use_visual_scorer: true
//      }
//    }
//
class ActiveSpeakerToRegionCalculator : public CalculatorBase {
 public:
  ActiveSpeakerToRegionCalculator();
  ~ActiveSpeakerToRegionCalculator() override {}
  ActiveSpeakerToRegionCalculator(const ActiveSpeakerToRegionCalculator&) = delete;
  ActiveSpeakerToRegionCalculator& operator=(const ActiveSpeakerToRegionCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  ::mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  ::mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;

 private:
  // Calculator options.
  ActiveSpeakerToRegionCalculatorOptions options_;
  // A scorer used to assign weights to active speakers.
  std::unique_ptr<VisualScorer> scorer_;
  // Dimensions of video frame
  int frame_width_;
  int frame_height_;
}; // end with inheritance

REGISTER_CALCULATOR(ActiveSpeakerToRegionCalculator);

ActiveSpeakerToRegionCalculator::ActiveSpeakerToRegionCalculator() {}

::mediapipe::Status ActiveSpeakerToRegionCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  if (cc->Inputs().HasTag(kInputVideo)) {
    cc->Inputs().Tag(kInputVideo).Set<ImageFrame>();
  }
  cc->Inputs().Tag(kInputRois).Set<std::vector<Detection>>();
  cc->Outputs().Tag(kOutputRegion).Set<DetectionSet>();
  return ::mediapipe::OkStatus();
}

::mediapipe::Status ActiveSpeakerToRegionCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<ActiveSpeakerToRegionCalculatorOptions>();
  if (!cc->Inputs().HasTag(kInputVideo)) {
    RET_CHECK(!options_.use_visual_scorer())
        << "VIDEO input must be provided when using visual_scorer.";
  }

  scorer_ = absl::make_unique<VisualScorer>(options_.scorer_options());
  frame_width_ = -1;
  frame_height_ = -1;
  return ::mediapipe::OkStatus();
}

::mediapipe::Status ActiveSpeakerToRegionCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  if (cc->Inputs().HasTag(kInputVideo) &&
      cc->Inputs().Tag(kInputVideo).Value().IsEmpty()) {
    return ::mediapipe::UnknownErrorBuilder(MEDIAPIPE_LOC)
           << "No VIDEO input at time " << cc->InputTimestamp().Seconds();
  }

  cv::Mat frame;
  if (cc->Inputs().HasTag(kInputVideo)) {
    frame = mediapipe::formats::MatView(
        &cc->Inputs().Tag(kInputVideo).Get<ImageFrame>());
    frame_width_ = frame.cols;
    frame_height_ = frame.rows;
  }

  auto region_set = ::absl::make_unique<DetectionSet>();
  if (!cc->Inputs().Tag(kInputRois).Value().IsEmpty()) {
    const auto& input_rois =
        cc->Inputs().Tag(kInputRois).Get<std::vector<Detection>>();

    for (const auto& input_roi : input_rois) {
      RET_CHECK(input_roi.location_data().format() ==
        mediapipe::LocationData::RELATIVE_BOUNDING_BOX)
        << "Speaker detection input is lacking required relative_bounding_box()";
      const auto& location = input_roi.location_data().relative_bounding_box();

      float x = std::max(0.0f, location.xmin());
      float y = std::max(0.0f, location.ymin());
      float width =
          std::min(location.width() - x + location.xmin(), 1 - x);
      float height = 
          std::min(location.height() - y + location.ymin(), 1 - y);

      // Convert the text bounding box to a region.
      SalientRegion* region = region_set->add_detections();
      region->mutable_location_normalized()->set_x(x);
      region->mutable_location_normalized()->set_y(y);
      region->mutable_location_normalized()->set_width(width);
      region->mutable_location_normalized()->set_height(height);
      region->mutable_signal_type()->set_standard(SignalType::SPEAKER);

      // Score the scores based on image cues.
      float visual_score = 1.0f;
      if (options_.use_visual_scorer()) {
        MP_RETURN_IF_ERROR(
            scorer_->CalculateScore(frame, *region, &visual_score));
        }
      region->set_score(visual_score);
      }
    }
  cc->Outputs().Tag(kOutputRegion).Add(region_set.release(), cc->InputTimestamp());

  return ::mediapipe::OkStatus();
}

}  // namespace autoflip
}  // namespace mediapipe

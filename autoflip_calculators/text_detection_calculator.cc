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

// EAST model with opencv https://docs.opencv.org/master/db/da4/samples_2dnn_2text_detection_8cpp-example.html

#include <algorithm>
#include <memory>

#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/text_detection_calculator.pb.h"
#include "mediapipe/examples/desktop/autoflip/quality/visual_scorer.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/formats/location_data.pb.h"
#include "mediapipe/framework/port/opencv_core_inc.h"
#include "mediapipe/framework/port/opencv_imgproc_inc.h"
#include "mediapipe/framework/port/opencv_dnn_inc.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_builder.h"

namespace mediapipe {
namespace autoflip {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kOutputRegion[] = "REGIONS";
// Constants for cv::dnn::blobfromimage.
const float kScaleFactor = 1.0;
const float kMeanR = 103.94;
const float kMeanG = 116.78;
const float kMeanB = 123.68;


// This calculator detects texts in the images and converts detected texts 
// to SalientRegion protos that can be used for downstream processing. Each
// SalientRegion is scored using image cues. 
// Example:
//    calculator: "TextDetectionCalculator"
//    input_stream: "VIDEO:frames"
//    output_stream: "REGIONS:regions"
//    options:{
//      [mediapipe.autoflip.TextDetectionCalculatorOptions.ext]: {
//        use_visual_scorer: true
//        model_path: "/path/to/modelname.pb"
//        confidence_threshold: 0.5
//        nms_threshold: 0.4
//        east_width: 320
//        east_height: 320
//      }
//    }
//
class TextDetectionCalculator : public CalculatorBase {
 public:
  TextDetectionCalculator();
  ~TextDetectionCalculator() override {}
  TextDetectionCalculator(const TextDetectionCalculator&) = delete;
  TextDetectionCalculator& operator=(const TextDetectionCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  ::mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  ::mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;

 private:
  // Detect the text.
  void DetectText(const cv::Mat& frame, cv::Mat* scores, cv::Mat* geometry);
  // Decode the outputs of the EAST neural network
  ::mediapipe::Status DecodeBoundingBoxes(const cv::Mat& socres,
        const cv::Mat& geometry, const float score_treshoud,
        std::vector<cv::RotatedRect>* detections, std::vector<float>* confidences);
  // Converts detected texts to SalientRegion protos.
  ::mediapipe::Status ConvertToRegions(const cv::Mat& frame, 
        const std::vector<cv::RotatedRect>& bboxes, const std::vector<float>& confidences,
        const std::vector<int>& indices, DetectionSet* region_set);
  // Calculator options.
  TextDetectionCalculatorOptions options_;
  // A scorer used to assign weights to texts.
  std::unique_ptr<VisualScorer> scorer_;
  // Text detector.
  cv::dnn::Net detector_;

}; // end with inheritance

REGISTER_CALCULATOR(TextDetectionCalculator);

TextDetectionCalculator::TextDetectionCalculator() {}

::mediapipe::Status TextDetectionCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  cc->Inputs().Tag(kInputVideo).Set<ImageFrame>();
  cc->Outputs().Tag(kOutputRegion).Set<DetectionSet>();

  return ::mediapipe::OkStatus();
}

::mediapipe::Status TextDetectionCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<TextDetectionCalculatorOptions>();
  scorer_ = absl::make_unique<VisualScorer>(options_.scorer_options());
  RET_CHECK(!options_.model_path().empty())
      << "Model path in options is required.";
  try {
      detector_ = cv::dnn::readNet(options_.model_path());
  }
  catch (cv::Exception & e) {
      return mediapipe::InvalidArgumentError("error loading model path: " + e.msg.operator std::string());
  }
  return ::mediapipe::OkStatus();
}

::mediapipe::Status TextDetectionCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  if (cc->Inputs().Tag(kInputVideo).Value().IsEmpty()) {
    return ::mediapipe::UnknownErrorBuilder(MEDIAPIPE_LOC)
           << "No VIDEO input at time " << cc->InputTimestamp().Seconds();
  }

  cv::Mat frame;
  frame = mediapipe::formats::MatView(
      &cc->Inputs().Tag(kInputVideo).Get<ImageFrame>());
  // Detect the text.
  cv::Mat scores, geometry;
  DetectText(frame, &scores, &geometry);
  // Decode predicted bounding boxes and corresponding confident scores.
  std::vector<cv::RotatedRect> boxes;
  std::vector<float> confidences;
  DecodeBoundingBoxes(scores, geometry, options_.confidence_threshold(), &boxes, &confidences);
  // Apply non-maximum suppression procedure.
  std::vector<int> indices;
  cv::dnn::NMSBoxes(boxes, confidences, options_.confidence_threshold(), options_.nms_threshold(), indices);
  // Converts detected texts to SalientRegion protos.
  auto region_set = ::absl::make_unique<DetectionSet>();
  ConvertToRegions(frame, boxes, confidences, indices, region_set.get());
  cc->Outputs().Tag(kOutputRegion).Add(region_set.release(), cc->InputTimestamp());

  return ::mediapipe::OkStatus();
} 

void TextDetectionCalculator::DetectText(const cv::Mat& frame, cv::Mat* scores, cv::Mat* geometry) {
  cv::Mat blob;
  // Mean subtraction and scalling.
  cv::dnn::blobFromImage(frame, blob, kScaleFactor, cv::Size(options_.east_width(), options_.east_height()), 
                cv::Scalar(kMeanB, kMeanG, kMeanR), true, false);
  // Detect the text.
  detector_.setInput(blob);
  std::vector<cv::Mat> outs;
  std::vector<cv::String> out_names{"feature_fusion/Conv_7/Sigmoid", "feature_fusion/concat_3"};
  detector_.forward(outs, out_names);
  *scores = outs[0];
  *geometry = outs[1];
}

::mediapipe::Status TextDetectionCalculator::DecodeBoundingBoxes(const cv::Mat& scores, 
            const cv::Mat& geometry, const float score_treshoud,
            std::vector<cv::RotatedRect>* detections, std::vector<float>* confidences) {
    detections->clear();
    const int height = scores.size[2];
    const int width = scores.size[3];
    for (int y = 0; y < height; ++y) {
        const float* scores_data = scores.ptr<float>(0, 0, y);
        const float* x0_data = geometry.ptr<float>(0, 0, y);
        const float* x1_data = geometry.ptr<float>(0, 1, y);
        const float* x2_data = geometry.ptr<float>(0, 2, y);
        const float* x3_data = geometry.ptr<float>(0, 3, y);
        const float* angles_data = geometry.ptr<float>(0, 4, y);

        for (int x = 0; x < width; ++x) {
            float score = scores_data[x];
            if (score < score_treshoud)
                continue;
            
            // Decode a prediction.
            // Multiple by 4 because maps are 4 time less than input image.
            float offset_x = x * 4.0f, offset_y = y * 4.0f;
            float angle = angles_data[x];
            float cosA = std::cos(angle);
            float sinA = std::sin(angle);
            float h = x0_data[x] + x2_data[x];
            float w = x1_data[x] + x3_data[x];

            cv::Point2f offset(offset_x + cosA * x1_data[x] + sinA * x2_data[x],
                           offset_y - sinA * x1_data[x] + cosA * x2_data[x]);
            cv::Point2f p1 = cv::Point2f(-sinA * h, -cosA * h) + offset;
            cv::Point2f p3 = cv::Point2f(-cosA * w, sinA * w) + offset;

            cv::RotatedRect r(0.5f * (p1 + p3), cv::Size2f(w, h), -angle * 180.0f / (float)CV_PI);
            detections->push_back(r);
            confidences->push_back(score);
        } // end for x
    } // end for y

    return ::mediapipe::OkStatus(); 
}   
::mediapipe::Status TextDetectionCalculator::ConvertToRegions(const cv::Mat& frame,
        const std::vector<cv::RotatedRect>& bboxes, const std::vector<float>& confidences,
        const std::vector<int>& indices, DetectionSet* region_set) {
  for (size_t i = 0; i < indices.size(); ++i) {
    cv::Rect2f box = bboxes[indices[i]].boundingRect();
    float text_confidence = confidences[indices[i]];
    
    // Normalize the bounding box, note that the frame is resized
    // to (options_.east_width(), options_.east_height()) in DetectText.
    box.x /= options_.east_width();
    box.y /= options_.east_height();
    box.width /= options_.east_width();
    box.height /= options_.east_height();
    float x = std::max(0.0f, box.x);
    float y = std::max(0.0f, box.y);
    float width =
        std::min(box.width - x + box.x, 1 - x);
    float height = 
        std::min(box.height - y + box.y, 1 - y);

    // Convert the text bounding box to a region.
    SalientRegion* region = region_set->add_detections();
    region->mutable_location_normalized()->set_x(x);
    region->mutable_location_normalized()->set_y(y);
    region->mutable_location_normalized()->set_width(width);
    region->mutable_location_normalized()->set_height(height);
    region->mutable_signal_type()->set_standard(SignalType::TEXT);

    // Score the text based on image cues.
    if (options_.use_visual_scorer()) {
      MP_RETURN_IF_ERROR(
          scorer_->CalculateScore(frame, *region, &text_confidence));
    }
    region->set_score(text_confidence);
  }
  return ::mediapipe::OkStatus(); 
}

}  // namespace autoflip
}  // namespace mediapipe

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
const float kSCALE_FACTOR = 1.0;
const float kMEAN_R = 103.94;
const float kMEAN_G = 116.78;
const float kMEAN_B = 123.68;
// Input fore EAST model has to be a multiple of 32 
const int EAST_WIDTH = 320;
const int EAST_HEIGHT = 320;


// This calculator detects texts in the images and converts detected texts 
// to SalientRegion protos that can be used for downstream processing. Each
// SalientRegion is scored using image cues. 
// Example:
//    calculator: "TextDetectionCalculator"
//    input_stream: "VIDEO:frames"
//    output_stream: "REGIONS:regions"
//    options:{
//      [mediapipe.autoflip.TextDetectionCalculatorOptions.ext]:{
//        use_visual_scorer: True
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
  // Decode the outputs of the EAST neural network
  void DecodeBoundingBoxes(const cv::Mat& socres, const cv::Mat& geometry, float scoreTresh,
                         std::vector<cv::RotatedRect>& detections, std::vector<float>& confidences);

  // Detect the text.
  void DetectText(const cv::Mat& frame, cv::dnn::Net detector,
                cv::Mat& scores, cv::Mat& geometry);

  // Calculator options.
  TextDetectionCalculatorOptions options_;

  // A scorer used to assign weights to texts.
  std::unique_ptr<VisualScorer> scorer_;

  // Threshold to determine whether a target is text,
  // if greater than kConfidence_threshold_, it's text.
  const float kConfidence_threshold_ = 0.5;
  
  // Threshold for non maximum supression.
  const float kNMS_threshold_ = 0.4;

  // Text detection model path.
  cv::String kModel_path_ = "/usr/local/google/home/zzhencchen/mediapipe/mediapipe/models/frozen_east_text_detection.pb";

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
  detector_ = cv::dnn::readNet(kModel_path_);

  return ::mediapipe::OkStatus();
}

void TextDetectionCalculator::DecodeBoundingBoxes(const cv::Mat& scores, const cv::Mat& geometry, float scoreThresh,
                         std::vector<cv::RotatedRect>& detections, std::vector<float>& confidences) {
    detections.clear();
    CV_Assert(scores.dims == 4);
    CV_Assert(scores.size[0] == 1);
    CV_Assert(scores.size[1] == 1);
    CV_Assert(geometry.dims == 4);
    CV_Assert(geometry.size[0] == 1);
    CV_Assert(geometry.size[1] == 5);
    CV_Assert(scores.size[2] == geometry.size[2]);
    CV_Assert(scores.size[3] == geometry.size[3]);

    const int height = scores.size[2];
    const int width = scores.size[3];
    for (int y = 0; y < height; ++y) {
        const float* scoresData = scores.ptr<float>(0, 0, y);
        const float* x0_data = geometry.ptr<float>(0, 0, y);
        const float* x1_data = geometry.ptr<float>(0, 1, y);
        const float* x2_data = geometry.ptr<float>(0, 2, y);
        const float* x3_data = geometry.ptr<float>(0, 3, y);
        const float* anglesData = geometry.ptr<float>(0, 4, y);

        for (int x = 0; x < width; ++x) {
            float score = scoresData[x];
            if (score < scoreThresh)
                continue;
            
            // Decode a prediction.
            // Multiple by 4 because maps are 4 time less than input image.
            float offsetX = x * 4.0f, offsetY = y * 4.0f;
            float angle = anglesData[x];
            float cosA = std::cos(angle);
            float sinA = std::sin(angle);
            float h = x0_data[x] + x2_data[x];
            float w = x1_data[x] + x3_data[x];

            cv::Point2f offset(offsetX + cosA * x1_data[x] + sinA * x2_data[x],
                           offsetY - sinA * x1_data[x] + cosA * x2_data[x]);
            cv::Point2f p1 = cv::Point2f(-sinA * h, -cosA * h) + offset;
            cv::Point2f p3 = cv::Point2f(-cosA * w, sinA * w) + offset;

            cv::RotatedRect r(0.5f * (p1 + p3), cv::Size2f(w, h), -angle * 180.0f / (float)CV_PI);
            detections.push_back(r);
            confidences.push_back(score);
        } // end for x
    } // end for y
}   

void TextDetectionCalculator::DetectText(const cv::Mat& frame, cv::dnn::Net detector, cv::Mat& scores, cv::Mat& geometry) {
  cv::Mat blob;
  // Mean subtraction and scalling.
  // Details for blobFromImage: https://docs.opencv.org/3.4/d6/d0f/group__dnn.html#ga98113a886b1d1fe0b38a8eef39ffaaa0.
  cv::dnn::blobFromImage(frame, blob, kSCALE_FACTOR, cv::Size(EAST_WIDTH, EAST_HEIGHT), 
                cv::Scalar(kMEAN_B, kMEAN_G, kMEAN_R), true, false);
  // Detect the text.
  detector.setInput(blob);
  std::vector<cv::Mat> outs;
  std::vector<cv::String> outNames(2);
  outNames[0] = "feature_fusion/Conv_7/Sigmoid";
  outNames[1] = "feature_fusion/concat_3";
  detector.forward(outs, outNames);

  scores = outs[0];
  geometry = outs[1];
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
  DetectText(frame, detector_, scores, geometry);

  // Decode predicted bounding boxes and corresponding confident scores.
  std::vector<cv::RotatedRect> boxes;
  std::vector<float> confidences;
  DecodeBoundingBoxes(scores, geometry, kConfidence_threshold_, boxes, confidences);

  // Apply non-maximum suppression procedure.
  std::vector<int> indices;
  cv::dnn::NMSBoxes(boxes, confidences, kConfidence_threshold_, kNMS_threshold_, indices);

  // Converts detected texts to SalientRegion protos.
  auto region_set = ::absl::make_unique<DetectionSet>();
  for (size_t i = 0; i < indices.size(); ++i) {
    cv::RotatedRect& box = boxes[indices[i]];
    cv::Rect2f RectBox = box.boundingRect();
    float text_score = confidences[indices[i]];
    
    // Normalize the bounding box, note that the frame is
    // resized to (EAST_WIDTH, EAST_HEIGHT) in DetectText.
    RectBox.x /= EAST_WIDTH;
    RectBox.y /= EAST_HEIGHT;
    RectBox.width /= EAST_WIDTH;
    RectBox.height /= EAST_HEIGHT;
    float x = std::max(0.0f, RectBox.x);
    float y = std::max(0.0f, RectBox.y);
    float width =
        std::min(RectBox.width - x + RectBox.x, 1 - x);
    float height = 
        std::min(RectBox.height - y + RectBox.y, 1 - y);

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
          scorer_->CalculateScore(frame, *region, &text_score));
    }
    region->set_score(text_score);
  }
  cc->Outputs().Tag(kOutputRegion).Add(region_set.release(), cc->InputTimestamp());

  return ::mediapipe::OkStatus();
}

}  // namespace autoflip
}  // namespace mediapipe

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

// This calculator detects texts in the images and converts detected texts 
// to SalientRegion protos that can be used for downstream processing. Each
// SalientRegion is scored using image cues. 
// Example:
//    calculator: "TextDetectionCalculator"
//    input_stream: "VIDEO:frames"
//    output_stream: "REGIONS:regions"
//    options:{
//      [mediapipe.autoflip.TextDetectionCalculatorOptions.ext]:{
//        export_text_bounding_box: True
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
  double NormalizeX(const int pixel);
  double NormalizeY(const int pixel);
  // Decode the outputs of the EAST neural network
  void DecodeBoundingBoxes(const cv::Mat& socres, const cv::Mat& geometry, float scoreTresh,
                         std::vector<RotatedRect>& detections, std::vector<float>& confidences);

  // Calculator options.
  TextDetectionCalculatorOptions options_;

  // A scorer used to assign weights to texts.
  std::unique_ptr<VisualScorer> scorer_;

  // Dimensions of video frame
  int frame_width_;
  int frame_height_;

  const float confidence_threshold = 0.7; //0.5;
  const float nms_threshold = 0.4;
  const std::string model_path = "/mediapipe/models/frozen_east_text_detection.pb";
  cv::dnn::Net detector;
  std::vector<Mat> outs;
  std::vector<String> outNames(2);

}; // end with inheritance

REGISTER_CALCULATOR(TextDetectionCalculator);

TextDetectionCalculator::TextDetectionCalculator() {}

::mediapipe::Status TextDetectionCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  if (cc->Inputs().HasTag("VIDEO")) {
    cc->Inputs().Tag("VIDEO").Set<ImageFrame>();
  }
  cc->Outputs().Tag("REGIONS").Set<DetectionSet>();
  return ::mediapipe::OkStatus();
}

::mediapipe::Status TextDetectionCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<TextDetectionCalculatorOptions>();
  if (!cc->Inputs().HasTag("VIDEO")) {
    RET_CHECK(!options_.use_visual_scorer())
        << "VIDEO input must be provided when using visual_scorer.";
    RET_CHECK(!options_.export_text_bounding_box())
        << "VIDEO input must be provided when export_text_bounding_box "
           "is set true.";
  }

  scorer_ = absl::make_unique<VisualScorer>(options_.scorer_options());
  frame_width_ = -1;
  frame_height_ = -1;
  detector = cv::dnn::readNet(model_path);
  outNames[0] = "feature_fusion/Conv_7/Sigmoid";
  outNames[1] = "feature_fusion/concat_3";

  return ::mediapipe::OkStatus();
}

inline double TextDetectionCalculator::NormalizeX(const int pixel) {
  return pixel / static_cast<double>(frame_width_);
}

inline double TextDetectionCalculator::NormalizeY(const int pixel) {
  return pixel / static_cast<double>(frame_height_);
}

void TextDetectionCalculator::DecodeBoundingBoxes(const Mat& scores, const Mat& geometry, float scoreThresh,
                         std::vector<RotatedRect>& detections, std::vector<float>& confidences) {
    detections.clear();
    RET_CHECK(scores.dims == 4)
        << "Scores' dimension must be 4.";
    RET_CHECK(scores.size[0] == 1)
        << "scores.size[0] must be 1.";
    RET_CHECK(scores.size[1] == 1)
        << "scores.size[1] must 1.";
    RET_CHECK(geometry.dims == 4)
        << "Geometry dimension must be 4.";
    RET_CHECK(geometry.size[0] == 1)
        << "geometry.size[0] must be 1.";
    RET_CHECK(geometry.size[1] == 5)
        << "geometry.size[1] must be 5.";
    RET_CHECK(scores.size[2] == geometry.size[2])
        << "scores.size[2] must equal to geometry.size[2].";
    RET_CHECK(scores.size[3] == geometry.size[3])
        << "scores.size[3] must equal to geometry.size[3].";

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
            cv::Point2f p1 = Point2f(-sinA * h, -cosA * h) + offset;
            cv::Point2f p3 = Point2f(-cosA * w, sinA * w) + offset;

            cv::RotatedRect r(0.5f * (p1 + p3), Size2f(w, h), -angle * 180.0f / (float)CV_PI);
            detections.push_back(r);
            confidences.push_back(score);
        } // end for x
    } // end for y
}   

::mediapipe::Status TextDetectionCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  // What if !cc->Inputs.HasTag("VIDEO")
  if (cc->Inputs().HasTag("VIDEO") &&
      cc->Inputs().Tag("VIDEO").Value().IsEmpty()) {
    return ::mediapipe::UnknownErrorBuilder(MEDIAPIPE_LOC)
           << "No VIDEO input at time " << cc->InputTimestamp().Seconds();
  }

  if (cc->Inputs().HasTag("VIDEO")) {
    cv::Mat frame, blob;
    frame = mediapipe::formats::MatView(
        &cc->Inputs().Tag("VIDEO").Get<ImageFrame>());
    frame_width_ = frame.cols;
    frame_height_ = frame.rows;

    // Mean subtraction and scalling.
    blobFromImage(frame, blob, 1.0, Size(frame_width_, frame_height_), 
                  Scalar(123.68, 116.78, 103.94), true, false);
    // Detect the text.
    detector.setInput(blob);
    detector.forward(outs, outNames);

    cv::Mat scores = outs[0];
    cv::Mat geometry = outs[1];

    // Decode predicted bounding boxes and corresponding confident scores.
    std::vector<RotatedRect> boxes;
    std::vector<float> confidences;
    DecodeBoundingBoxes(scores, geometry, confidence_threshold, boxes, confidences);

    // Apply non-maximum suppression procedure.
    std::vector<int> indices;
    cv::dnn::NMSBoxes(boxes, confidences, confidence_threshold, nms_threshold, indices);

    auto region_set = ::absl::make_unique<DetectionSet>();
    for (size_t i = 0; i < indices.size(); ++i) {
      cv::RotatedRect& box = boxes[indices[i]];
      cv::Rect2f RectBox = box.boundingRect();
      float text_score = confidences[indices[i]];
      
      // Normalize the bounding box.
      RectBox.x = NormalizeX(RectBox.x);
      RectBox.y = NormalizeY(RectBox.y);
      RectBox.width = NormalizeX(RectBox.width);
      RectBox.height = NormalizeY(RectBox.height);
      float x = std::max(0.0f, RectBox.x);
      float y = std::max(0.0f, RectBox.y);
      float width =
          std::min(NormalizeX(RectBox.width) - x + RectBox.x, 1 - x);
      float height = 
          std::min(RectBox.height - y + RectBox.y, 1 - y);

      // Convert the text bounding box to a region.
      if (options_.export_text_bounding_box()) {
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
    }
    cc->Outputs().Tag("REGIONS").Add(region_set.release(), cc->InputTimestamp());
  }

  return ::mediapipe::OkStatus();
}

}  // namespace autoflip
}  // namespace mediapipe

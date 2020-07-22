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
#include <cmath>

#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/lip_track_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/formats/detection.pb.h"
#include "mediapipe/framework/formats/rect.pb.h"
#include "mediapipe/framework/formats/landmark.pb.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_builder.h"
#include "mediapipe/framework/port/opencv_core_inc.h"
#include "mediapipe/framework/port/opencv_imgproc_inc.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"


namespace mediapipe {
namespace autoflip {

constexpr char kInputVideo[] = "VIDEO";
constexpr char kInputLandmark[] = "LANDMARKS";
constexpr char kInputROI[] = "ROIS_FROM_LANDMARKS";
constexpr char kOutputROI[] = "ROIS";

// Lip contour landmarks.
const int32 kLipLeftInnerCornerIdx = 78;
const int32 kLipRightInnerCornerIdx = 308;
const std::vector<int32> kLipUpperIdx{82, 13, 312};
const std::vector<int32> kLipLowerIdx{87, 14, 317};

// Landmarks size
const int32 kFaceMeshLandmarks = 468;

// This calculator tracks the lip motion and detects active speakers in the images.
// Lip contour is obtained from face mesh. The output is speakers' face bound boxes. 
// Example:
//    calculator: "LipTrackCalculator"
//    input_stream: "VIDEO:input_video"
//    input_stream: "LANDMARKS:multi_face_landmarks"
//    input_stream: "ROIS_FROM_LANDMARKS:face_rects_from_landmarks"
//    output_stream: "ROIS:active_speakers_rects"
//    options:{
//      [mediapipe.autoflip.LipTrackCalculatorOptions.ext]: {
//        frame_history: 10
//        iou_threshold: 0.5
//        lip_mean_threshold: 0.3
//        lip_variance_threshold: 0.3
//      }
//    }
//

class LipTrackCalculator : public CalculatorBase {
 public:
  LipTrackCalculator();
  ~LipTrackCalculator() override {}
  LipTrackCalculator(const LipTrackCalculator&) = delete;
  LipTrackCalculator& operator=(const LipTrackCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  ::mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  ::mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;

 private:
  // Obtain lip statistics from face landmarks
  void GetStatistics(const std::vector<NormalizedLandmarkList>& landmark_lists, 
                    std::vector<float>* lip_statistics); 
  // Find match face from last frame. If not find, return -1, otherwise
  // return the face index.
  int MatchFace(const NormalizedRect& face_bbox);
  // Determine whether the face is active speaker or not.
  bool IsActiveSpeaker(const std::deque<float>& face_lip_statistics);
  // Calculator the absolute Euclidean distance between two landmarks.
  float GetDistance(const NormalizedLandmark& mark_1, const NormalizedLandmark& mark_2);
  // Calculator IOU of two face bboxes.
  float GetIOU(const NormalizedRect& bbox_1, const NormalizedRect& bbox_2);
   
  // Calculator options.
  LipTrackCalculatorOptions options_;
  // Face bounding boxes in last frame.
  std::vector<NormalizedRect> face_bbox_;
  // Face statistics in previous frames.
  std::map<int32, std::deque<float>> face_statistics_;
  // Dimensions of video frame
  int frame_width_;
  int frame_height_;
}; // end with inheritance

REGISTER_CALCULATOR(LipTrackCalculator);

LipTrackCalculator::LipTrackCalculator() {}

::mediapipe::Status LipTrackCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  cc->Inputs().Tag(kInputVideo).Set<ImageFrame>();
  if (cc->Inputs().HasTag(kInputLandmark)) {
    cc->Inputs().Tag(kInputLandmark).Set<std::vector<NormalizedLandmarkList>>();
  }
  if (cc->Inputs().HasTag(kInputROI)) {
    cc->Inputs().Tag(kInputROI).Set<std::vector<NormalizedRect>>();
  }
  cc->Outputs().Tag(kOutputROI).Set<std::vector<NormalizedRect>>();

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<LipTrackCalculatorOptions>();

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  auto output_bbox = ::absl::make_unique<std::vector<NormalizedRect>>();
  std::vector<NormalizedRect> cur_face_bbox;
  std::map<int32, std::deque<float>> cur_face_statistics;
  std::vector<float> statistics;
  
  cv::Mat frame;
  frame = mediapipe::formats::MatView(
      &cc->Inputs().Tag(kInputVideo).Get<ImageFrame>());
  frame_width_ = frame.cols;
  frame_height_ = frame.rows;

  const auto& input_landmark_lists = 
        cc->Inputs().Tag(kInputLandmark).Get<std::vector<NormalizedLandmarkList>>();
  const auto& input_face_bbox =
        cc->Inputs().Tag(kInputROI).Get<std::vector<NormalizedRect>>();
  
  GetStatistics(input_landmark_lists, &statistics);
  for (auto& s : statistics)
    LOG(ERROR) << "Statistics: " << s;
  
  for (int i = 0; i < input_face_bbox.size(); ++i) {
    auto& bbox = input_face_bbox[i];
    cur_face_bbox.push_back(bbox);
    int32 cur_face_idx = cur_face_bbox.size() - 1;

    // Check whether the face appeared before
    int previous_face_idx = MatchFace(bbox);
    cur_face_statistics.insert(std::pair< int32, std::deque<float> >(cur_face_idx, std::deque<float>()));
    // If the face appeared, add the new data to the previous deque.
    if (previous_face_idx != -1) {
      LOG(ERROR) << "Matched!";
      // Add previous statistics.
      for (auto& value : face_statistics_[previous_face_idx]) 
        cur_face_statistics[cur_face_idx].push_back(value);
      // Add new statistics.
      cur_face_statistics[cur_face_idx].push_back(statistics[i]);
      while (cur_face_statistics[cur_face_idx].size() > options_.frame_history())
        cur_face_statistics[cur_face_idx].pop_front();
    }
    // If the face did not appear, add the new data.
    else {
      LOG(ERROR) << "Not atched!";
      cur_face_statistics[cur_face_idx].push_back(statistics[i]);
    }
    if (IsActiveSpeaker(cur_face_statistics[cur_face_idx]))
      output_bbox->push_back(bbox);
  }

  // Update the history
  face_bbox_ = cur_face_bbox;
  face_statistics_ = cur_face_statistics;

  cc->Outputs().Tag(kOutputROI).Add(output_bbox.release(), cc->InputTimestamp());

  return ::mediapipe::OkStatus();
} 

float LipTrackCalculator:: GetDistance(const NormalizedLandmark& mark_1,
                                      const NormalizedLandmark& mark_2) {                              
  return std::sqrt(std::pow((mark_1.x()-mark_2.x())*frame_width_, 2) 
  + std::pow((mark_1.y()-mark_2.y())*frame_height_, 2));
}

void LipTrackCalculator:: GetStatistics(const std::vector<NormalizedLandmarkList>& landmark_lists, 
                    std::vector<float>* lip_statistics) {
  float mouth_width = 0.0f, mouth_height = 0.0f;
  for (const auto& landmark_list : landmark_lists) {
    if (landmark_list.landmark_size() < kFaceMeshLandmarks){
      LOG(ERROR) << "Unexpected number of landmarks.";
      continue;
    }
    mouth_width = GetDistance(landmark_list.landmark(kLipLeftInnerCornerIdx),
                              landmark_list.landmark(kLipRightInnerCornerIdx));
    for (auto i = 0; i < kLipUpperIdx.size(); ++i) {
      mouth_height += GetDistance(landmark_list.landmark(kLipUpperIdx[i]),
                              landmark_list.landmark(kLipLowerIdx[i]));
    }
    // Average the height is better since it may need more points in the future.
    mouth_height /= (float)kLipUpperIdx.size();
    lip_statistics->push_back(mouth_height / mouth_width);
  }
}

int LipTrackCalculator:: MatchFace(const NormalizedRect& face_bbox) {
  int32 idx = -1;
  float iou = 0, maxi_iou = 0;
  for (auto i = 0; i < face_bbox_.size(); ++i) {
    auto& bbox = face_bbox_[i];
    iou = GetIOU(bbox, face_bbox);
    LOG(ERROR) << "IOU: " << iou;
    if (iou < options_.iou_threshold())
      continue;
    if (iou > maxi_iou) {
      maxi_iou = iou;
      idx = i;
    }
  }
  return idx;
}

float LipTrackCalculator:: GetIOU(const NormalizedRect& bbox_1, const NormalizedRect& bbox_2) {
  cv::RotatedRect cv_bbox_1, cv_bbox_2;
  cv_bbox_1.center = cv::Point2f(bbox_1.x_center(), bbox_1.y_center());
  cv_bbox_1.size = cv::Size2f(bbox_1.width(), bbox_1.height());
  // Angle of cv::RotatedRect is degree while angle of
  // NormalizedRect is NormalizedRect. Both clockwise.
  cv_bbox_1.angle = 180.0f * bbox_1.rotation() / (float)M_PI;
  cv_bbox_2.center = cv::Point2f(bbox_2.x_center(), bbox_2.y_center());
  cv_bbox_2.size = cv::Size2f(bbox_2.width(), bbox_2.height());
  cv_bbox_2.angle = 180.0f * bbox_2.rotation() / (float)M_PI;

  // Get the vertices of intersecting region. 
  std::vector<cv::Point2f> intersecting_region;
  cv::rotatedRectangleIntersection(cv_bbox_1, cv_bbox_2, intersecting_region);
  float area_intersection = cv::contourArea(intersecting_region);
  float area_1 = bbox_1.width() * bbox_1.height();
  float area_2 = bbox_2.width() * bbox_2.height();

  return area_intersection / (area_1 + area_2 - area_intersection);
}

bool LipTrackCalculator:: IsActiveSpeaker(const std::deque<float>& face_lip_statistics) {
  // If a face only appears in a few frames, it's not an active speaker. 
  if (face_lip_statistics.size() <= options_.frame_history() / 2)
    return false;
  float mean = 0.0f, variance = 0.0f;
  for (auto& value : face_lip_statistics) {
    LOG(ERROR) << "Lip: " << value;
    mean += value;
  }
  mean /= (float)face_lip_statistics.size();
  
  for (auto& value : face_lip_statistics) 
    variance += std::pow(value - mean, 2);
  variance /= (float)face_lip_statistics.size();

  LOG(ERROR) << "Mean: " << mean << ". Variance: " << variance;
  LOG(ERROR) << "Mean threshold: " << options_.lip_mean_threshold();
  LOG(ERROR) << "Variance threshold: " << options_.lip_variance_threshold();

  // TODO determine the lip_mean_threshold and 
  // lip_variance_threshold with experiments.
  if (mean >= options_.lip_mean_threshold() 
    && variance >= options_.lip_variance_threshold())
    return true;
  return false;
}


}  // namespace autoflip
}  // namespace mediapipe

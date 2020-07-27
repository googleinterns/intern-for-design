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
#include <iostream>

#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/lip_track_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
// #include "mediapipe/framework/formats/detection.pb.h"
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

// (Optional) Output the frame with face mesh landmarks, as well
// as visualization of lip contour and related information.
constexpr char kOutputContour[] = "CONTOUR_INFORMATION_FRAME";

// Lip contour landmarks.
const int32 kLipLeftInnerCornerIdx = 78;
const int32 kLipRightInnerCornerIdx = 308;
const std::vector<int32> kLipUpperIdx{82, 13, 312};
const std::vector<int32> kLipLowerIdx{87, 14, 317};
const std::vector<int32> kLipContourIdx{78, 82, 13, 312, 308, 317, 14, 87};

// Landmarks size
const int32 kFaceMeshLandmarks = 468;

const cv::Scalar kRed = cv::Scalar(255.0, 0.0, 0.0); // active speaker bbox    
const cv::Scalar kGreen = cv::Scalar(0.0, 255.0, 0.0); // input contour, bbox
const cv::Scalar kBlue = cv::Scalar(0.0, 0.0, 255.0);  // landmarks
const cv::Scalar kWhite = cv::Scalar(255.0, 255.0, 255.0);  // infor

// This calculator tracks the lip motion and detects active speakers in the images.
// Lip contour is obtained from face mesh. The output is speakers' face bound boxes. 
// Example:
//    calculator: "LipTrackCalculator"
//    input_stream: "VIDEO:input_video"
//    input_stream: "LANDMARKS:multi_face_landmarks"
//    input_stream: "ROIS_FROM_LANDMARKS:face_rects_from_landmarks"
//    output_stream: "ROIS:active_speakers_rects"
//    output_stream: "CONTOUR_INFORMATION_FRAME:contour_information_frames"
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
  // Convert NormalizedRect to opencv RotatedRect
  cv::RotatedRect NormalizedRectToRotatedRect(const NormalizedRect& bbox);
  // Determine whether the face is active speaker or not.
  bool IsActiveSpeaker(const std::deque<float>& face_lip_statistics);
  // Calculator the absolute Euclidean distance between two landmarks.
  float GetDistance(const NormalizedLandmark& mark_1, const NormalizedLandmark& mark_2);
  // Calculator IOU of two face bboxes.
  float GetIOU(const NormalizedRect& bbox_1, const NormalizedRect& bbox_2);
  // Convert landmark to cv point2f.
  cv::Point2f LandmarkToPoint(const int idx, const NormalizedLandmarkList& landmark_list);
  // Draws and outputs visualization frames if those streams are present.
  ::mediapipe::Status OutputVizFrames(
                const std::vector<NormalizedLandmarkList>& input_landmark_lists,
                const std::vector<NormalizedRect>& active_speaker_bbox, 
                const cv::Mat& scene_frame, CalculatorContext* cc);
  ::mediapipe::Status DrawLandMarksAndInfor(
      const std::vector<NormalizedLandmarkList>& landmark_lists,
      const cv::Scalar& landmark_color, 
      const cv::Scalar& contour_color, cv::Mat* viz_mat);
  ::mediapipe::Status DrawBBox(const std::vector<NormalizedRect>& bboxes,
               const bool detected, const cv::Scalar& color, cv::Mat* viz_mat);  
   
  // Calculator options.
  LipTrackCalculatorOptions options_;
  // Face bounding boxes in last frame.
  std::vector<NormalizedRect> face_bbox_;
  // Face statistics in previous frames.
  std::map<int32, std::deque<float>> face_statistics_;
  // Dimensions of video frame
  int frame_width_ = -1;
  int frame_height_ = -1;
  ImageFormat::Format frame_format_ = ImageFormat::UNKNOWN;
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

  if (cc->Outputs().HasTag(kOutputContour)) {
    cc->Outputs().Tag(kOutputContour).Set<ImageFrame>();
  }

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
  std::map<int32, std::deque<float>> cur_face_statistics;
  std::vector<float> statistics;
  
  const auto& frame = cc->Inputs().Tag(kInputVideo).Get<ImageFrame>();
  frame_width_ = frame.Width();
  frame_height_ = frame.Height();
  frame_format_ = frame.Format();
  cv::Mat mat_frame = mediapipe::formats::MatView(&frame);


  const auto& input_landmark_lists = 
        cc->Inputs().Tag(kInputLandmark).Get<std::vector<NormalizedLandmarkList>>();
  const auto& input_face_bbox =
        cc->Inputs().Tag(kInputROI).Get<std::vector<NormalizedRect>>();
  
  // for (auto& landmark : input_landmark_lists){
  //   std::cout << landmark.landmark(78).x() << " " << landmark.landmark(78).y() << " " << landmark.landmark(78).z() << std::endl;
  // }
  
  GetStatistics(input_landmark_lists, &statistics);
  for (auto& s : statistics)
    // LOG(ERROR) << "Statistics: " << s;
  
  for (int cur_face_idx = 0; cur_face_idx < input_face_bbox.size(); ++cur_face_idx) {
    auto& bbox = input_face_bbox[cur_face_idx];
    // Check whether the face appeared before
    int previous_face_idx = MatchFace(bbox);
    cur_face_statistics.insert(std::pair< int32, std::deque<float> >(cur_face_idx, std::deque<float>()));
    // If the face appeared, add the new data to the previous deque.
    if (previous_face_idx != -1) {
      // Add previous statistics.
      for (auto& value : face_statistics_[previous_face_idx]) 
        cur_face_statistics[cur_face_idx].push_back(value);
      // Add new statistics.
      cur_face_statistics[cur_face_idx].push_back(statistics[cur_face_idx]);
      while (cur_face_statistics[cur_face_idx].size() > options_.frame_history())
        cur_face_statistics[cur_face_idx].pop_front();
    }
    // If the face did not appear, add the new data.
    else {
      cur_face_statistics[cur_face_idx].push_back(statistics[cur_face_idx]);
    }
    if (IsActiveSpeaker(cur_face_statistics[cur_face_idx]))
      output_bbox->push_back(bbox);
  }

  // Update the history
  face_bbox_ = input_face_bbox;
  face_statistics_ = cur_face_statistics;

  // Optionally output the visualization frames of lit contour and related information.
  if (cc->Outputs().HasTag(kOutputContour)) 
    MP_RETURN_IF_ERROR(OutputVizFrames(input_landmark_lists, *output_bbox.get(), mat_frame, cc));

  cc->Outputs().Tag(kOutputROI).Add(output_bbox.release(), cc->InputTimestamp());
  return ::mediapipe::OkStatus();
} 

float LipTrackCalculator::GetDistance(const NormalizedLandmark& mark_1,
                                      const NormalizedLandmark& mark_2) {                              
  return std::sqrt(std::pow((mark_1.x()-mark_2.x())*frame_width_, 2) 
  + std::pow((mark_1.y()-mark_2.y())*frame_height_, 2));
}

void LipTrackCalculator::GetStatistics(const std::vector<NormalizedLandmarkList>& landmark_lists, 
                    std::vector<float>* lip_statistics) {
  float mouth_width = 0.0f, mouth_height = 0.0f;
  for (const auto& landmark_list : landmark_lists) {
    if (landmark_list.landmark_size() < kFaceMeshLandmarks){
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

int LipTrackCalculator::MatchFace(const NormalizedRect& face_bbox) {
  int32 idx = -1;
  float iou = 0, maxi_iou = 0;
  for (auto i = 0; i < face_bbox_.size(); ++i) {
    auto& bbox = face_bbox_[i];
    iou = GetIOU(bbox, face_bbox);
    if (iou < options_.iou_threshold())
      continue;
    if (iou > maxi_iou) {
      maxi_iou = iou;
      idx = i;
    }
  }
  return idx;
}

cv::RotatedRect LipTrackCalculator::NormalizedRectToRotatedRect(const NormalizedRect& bbox) {
  // Angle of cv::RotatedRect is degree while angle of
  // NormalizedRect is NormalizedRect. Both clockwise.
  cv::RotatedRect cv_bbox;
  cv_bbox.center = cv::Point2f(bbox.x_center(), bbox.y_center());
  cv_bbox.size = cv::Size2f(bbox.width(), bbox.height());
  cv_bbox.angle = 180.0f * bbox.rotation() * 2;

  return cv_bbox;
}

float LipTrackCalculator::GetIOU(const NormalizedRect& bbox_1, const NormalizedRect& bbox_2) {
  cv::RotatedRect cv_bbox_1, cv_bbox_2;
  cv_bbox_1 = NormalizedRectToRotatedRect(bbox_1);
  cv_bbox_2 = NormalizedRectToRotatedRect(bbox_2);
  // Get the vertices of intersecting region. 
  std::vector<cv::Point2f> intersecting_region;
  int intersection_type =
    cv::rotatedRectangleIntersection(cv_bbox_1, cv_bbox_2, intersecting_region);
  float area_1 = bbox_1.width() * bbox_1.height();
  float area_2 = bbox_2.width() * bbox_2.height();
  if (intersection_type == cv::INTERSECT_NONE)
    return 0.0f;
  else if (intersection_type == cv::INTERSECT_PARTIAL){
    float area_intersection = cv::contourArea(intersecting_region);
    return area_intersection / (area_1 + area_2 - area_intersection);
  }
  else 
    return std::min(area_1, area_2) / std::max(area_1, area_2);
}

bool LipTrackCalculator::IsActiveSpeaker(const std::deque<float>& face_lip_statistics) {
  // If a face only appears in a few frames, it's not an active speaker. 
  if (face_lip_statistics.size() <= options_.frame_history() / 2)
    return false;
  float mean = 0.0f, variance = 0.0f;
  for (auto& value : face_lip_statistics) {
    mean += value;
  }
  mean /= (float)face_lip_statistics.size();
  
  for (auto& value : face_lip_statistics) 
    variance += std::pow(value - mean, 2);
  variance /= (float)face_lip_statistics.size();

  // TODO determine the lip_mean_threshold and 
  // lip_variance_threshold with experiments.
  if (mean >= options_.lip_mean_threshold() 
    && variance >= options_.lip_variance_threshold())
    return true;
  return false;
}

::mediapipe::Status LipTrackCalculator::OutputVizFrames(
    const std::vector<NormalizedLandmarkList>& input_landmark_lists,
    const std::vector<NormalizedRect>& active_speaker_bbox, 
    const cv::Mat& scene_frame, CalculatorContext* cc) {
  auto viz_frame = absl::make_unique<ImageFrame>(
    frame_format_, frame_width_, frame_height_);
  cv::Mat viz_mat = formats::MatView(viz_frame.get());
  scene_frame.copyTo(viz_mat);

  MP_RETURN_IF_ERROR(DrawLandMarksAndInfor(input_landmark_lists, 
              kGreen, kBlue, &viz_mat));
  // Draw input face bbox
  MP_RETURN_IF_ERROR(DrawBBox(face_bbox_, false, kGreen, &viz_mat));
  // Draw active speaker face bbox
  MP_RETURN_IF_ERROR(DrawBBox(active_speaker_bbox, true, kRed, &viz_mat));

  cc->Outputs().Tag(kOutputContour).Add(viz_frame.release(), cc->InputTimestamp());
  return ::mediapipe::OkStatus();
}

cv::Point2f LipTrackCalculator::LandmarkToPoint(const int idx, 
                const NormalizedLandmarkList& landmark_list) {
  return cv::Point2f(landmark_list.landmark(idx).x()*frame_width_, 
                    landmark_list.landmark(idx).y()*frame_height_);
}

::mediapipe::Status LipTrackCalculator::DrawLandMarksAndInfor(
      const std::vector<NormalizedLandmarkList>& landmark_lists,
      const cv::Scalar& landmark_color, 
      const cv::Scalar& contour_color, cv::Mat* viz_mat) {
  for (int i = 0; i < landmark_lists.size(); ++i) {
    auto& landmark_list = landmark_lists[i];
    std::deque<float> stat = face_statistics_[i];
    std::vector<cv::Point2f> vertices;
    for (auto& idx : kLipContourIdx)
      vertices.push_back(LandmarkToPoint(idx, landmark_list));
    for (int j = 0; j < 8; ++j) {
      // // Draw lip contour
      // cv::line(*viz_mat, vertices[i], vertices[(i+1)%4], contour_color, 2);
      // Draw lip landmarks
      cv::circle(*viz_mat, vertices[j], 3, landmark_color, CV_FILLED);
    }
    // Draw information
    float mean = 0.0f, variance = 0.0f;
    int base = 20, dy = 20;
    for (auto& value : stat) 
      mean += value;
    mean /= (float)stat.size();
    for (auto& value : stat) 
      variance += std::pow(value - mean, 2);
    variance /= (float)stat.size();
    std::string label = cv::format("Face_%d Histroy: %d  Mean: %.2f  Variance: %.2f", 
              i, stat.size(), mean, variance);
    cv::putText(*viz_mat, label, cv::Point2f(base,base+i*dy), cv::FONT_HERSHEY_COMPLEX_SMALL, 0.5, kWhite);
  }

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::DrawBBox(
    const std::vector<NormalizedRect>& bboxes, const bool detected,
    const cv::Scalar& color, cv::Mat* viz_mat) {
  for(int i = 0; i < bboxes.size(); ++i) {
    auto& bbox = bboxes[i];
    cv::RotatedRect cv_bbox = NormalizedRectToRotatedRect(bbox);
    cv_bbox.center.x *= frame_width_;
    cv_bbox.center.y *= frame_height_;
    cv_bbox.size.width *= frame_width_;
    cv_bbox.size.height *= frame_height_;
    cv::Point2f vertices[4];
    cv_bbox.points(vertices);
    for (int j = 0; j < 4; ++j)
      cv::line(*viz_mat, vertices[j], vertices[(j+1)%4], color, 2);
    if (!detected){
      std::string label = cv::format("Face_%d ", i);
      cv::putText(*viz_mat, label, vertices[0], cv::FONT_HERSHEY_COMPLEX_SMALL, 0.5, kWhite);
    }
  }
  return ::mediapipe::OkStatus();
}

}  // namespace autoflip
}  // namespace mediapipe

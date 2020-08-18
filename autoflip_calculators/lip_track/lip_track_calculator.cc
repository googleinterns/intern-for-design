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
constexpr char kInputDetection[] = "DETECTIONS";
constexpr char kInputShotBoundaries[] = "SHOT_BOUNDARIES";
constexpr char kOutputROI[] = "DETECTIONS_SPEAKERS";

// Output the shot boundary signal to change the camera quicily.
// It is better to set TRUE for turn-taking (i.e., two person
// talk in turn, debate, interview, movie). When setting FALSE
// the camera will move smoothly from previous speaker to current 
// speaker.
constexpr char kOutputShot[] = "IS_SPEAKER_CHANGE";

// (Optional) Output the frame with face mesh landmarks, as well
// as visualization of lip contour and related information.
constexpr char kOutputContour[] = "CONTOUR_INFORMATION_FRAME";

// Lip contour landmarks.
// Inner lip conrner
const int32 kLipLeftInnerCornerIdx = 78;
const int32 kLipRightInnerCornerIdx = 308;
// Inner upper lip landmarks
const std::vector<int32> kLipInnerUpperIdx{82, 13, 312};
// Inner lower lip landmarks
const std::vector<int32> kLipInnerLowerIdx{87, 14, 317};
// Inner lip contour
const std::vector<int32> kLipInnerContourIdx{78, 82, 13, 312, 308, 317, 14, 87};
// Outer lip conrner
const int32 kLipLeftOuterCornerIdx = 61;
const int32 kLipRightOuterCornerIdx = 291;
// Outer upper lip landmarks
const std::vector<int32> kLipOuterUpperIdx{37, 0, 267};
// Outer lower lip landmarks
const std::vector<int32> kLipOuterLowerIdx{84, 17, 314};
// Outer lip contour
const std::vector<int32> kLipOuterContourIdx{61, 37, 0, 267, 291, 84, 17, 314};

// Landmarks size
const int32 kFaceMeshLandmarks = 468;

const cv::Scalar kRed = cv::Scalar(255.0, 0.0, 0.0); // active speaker bbox    
const cv::Scalar kGreen = cv::Scalar(0.0, 255.0, 0.0); // input contour, bbox
const cv::Scalar kBlue = cv::Scalar(0.0, 0.0, 255.0);  // landmarks
const cv::Scalar kWhite = cv::Scalar(255.0, 255.0, 255.0);  // infor

struct LipSignal {
  std::vector<NormalizedLandmarkList> landmark_lists;
  std::vector<Detection> detections;
  cv::Mat frame;
  int64 timestamp;
};

// This calculator tracks the lip motion based on face mesh landmarks and detects
// active speakers in the images. Lip contour is obtained from face mesh. The output
// is speakers' face bound boxes. 
// Example:
//    calculator: "LipTrackCalculator"
//    input_stream: "VIDEO:input_video"
//    input_stream: "LANDMARKS:multi_face_landmarks"
//    input_stream: "DETECTIONS:face_detections"
//    output_stream: "DETECTIONS_SPEAKERS:active_speakers_detections"
//    output_stream: "IS_SPEAKER_CHANGE:speaker_change"
//    output_stream: "CONTOUR_INFORMATION_FRAME:contour_information_frames"
//    options:{
//      [mediapipe.autoflip.LipTrackCalculatorOptions.ext]: {
//        output_shot_boundary: true
//      }
//    }

class LipTrackCalculator : public CalculatorBase {
 public:
  LipTrackCalculator();
  ~LipTrackCalculator() override {}
  LipTrackCalculator(const LipTrackCalculator&) = delete;
  LipTrackCalculator& operator=(const LipTrackCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  ::mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  ::mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;
  ::mediapipe::Status Close(mediapipe::CalculatorContext* cc) override;

 private:
  // Obtain lip statistics from face landmarks
  ::mediapipe::Status GetStatistics(
    const std::vector<NormalizedLandmarkList>& landmark_lists, 
    int lip_left_corner, int lip_right_corner, const std::vector<int32>& lip_upper,
    const std::vector<int32>& lip_lower, std::vector<float>* lip_statistics); 
  // Find match face from last frame. If not find, return -1, otherwise
  // return the face index.
  int MatchFace(const Detection& face_bbox);
  // Convert Detection to opencv Rect
  cv::Rect2f DetectionToRect(const Detection& bbox);
  // Determine whether the face is active speaker or not.
  ::mediapipe::Status IsActiveSpeaker(const std::deque<float>& face_lip_statistics_inner, 
                    const std::deque<float>& face_lip_statistics_outer, bool* is_speaker);
  // Calculator the absolute Euclidean distance between two landmarks.
  float GetDistance(const NormalizedLandmark& mark_1, const NormalizedLandmark& mark_2);
  // Calculator IOU of two face bboxes.
  float GetIOU(const Detection& bbox_1, const Detection& bbox_2);
  void GetMeanAndVariance(const std::deque<float>& face_lip_statistics,
                float* mean, float* variance); 
  // Convert landmark to cv point2f.
  cv::Point2f LandmarkToPoint(const int idx, const NormalizedLandmarkList& landmark_list);
  // Draws and outputs visualization frames if those streams are present.
  ::mediapipe::Status OutputVizFrames(
                const std::vector<NormalizedLandmarkList>& input_landmark_lists,
                const std::vector<Detection>& detected_bbox,
                const std::vector<Detection>& active_speaker_bbox, 
                const cv::Mat& scene_frame, CalculatorContext* cc, int64 timestamp);
  ::mediapipe::Status DrawLandMarksAndInfor(
      const std::vector<NormalizedLandmarkList>& landmark_lists,
      const cv::Scalar& landmark_color, 
      const cv::Scalar& contour_color, cv::Mat* viz_mat);
  ::mediapipe::Status DrawBBox(const std::vector<Detection>& bboxes,
               const bool detected, const cv::Scalar& color, cv::Mat* viz_mat);  
  void Transmit(mediapipe::CalculatorContext* cc, bool is_speaker_change, int64 timestamp);
  ::mediapipe::Status ProcessScene(bool is_end_of_scene, ::mediapipe::CalculatorContext* cc);

  // Calculator options.
  LipTrackCalculatorOptions options_;
  // Face bounding boxes in last frame.
  std::vector<Detection> face_bbox_;
  // Face statistics in previous frames.
  std::map<int32, std::deque<float>> face_statistics_outer_;
  std::map<int32, std::deque<float>> face_statistics_inner_;
  // The indices are the face ids in the frame, and values
  // are the corresponding meta face ids. 
  std::vector<int32> meta_face_indices_;
  // Active speaker information.
  float speaker_mean_inner_ = 0;
  float speaker_variance_inner_ = 0;
  float speaker_mean_outer_ = 0;
  float speaker_variance_outer_ = 0;
  // For speaker shot.
  int pre_dominate_speaker_id_ = -1;
  std::vector<Detection> pre_dominate_speaker_detection_;
  // Last time a speaker shot was detected.
  Timestamp last_shot_timestamp_;
  // Last time the sence is processed.
  Timestamp last_sence_processed_timestamp_;
  // Dimensions of video frame.
  int frame_width_ = -1;
  int frame_height_ = -1;
  ImageFormat::Format frame_format_ = ImageFormat::UNKNOWN;
  // Store the input signals.
  std::vector<LipSignal> signal_buff_;
  bool pre_stop_by_scene_change_;
}; // end with inheritance

REGISTER_CALCULATOR(LipTrackCalculator);

LipTrackCalculator::LipTrackCalculator() {}

::mediapipe::Status LipTrackCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  cc->Inputs().Tag(kInputVideo).Set<ImageFrame>();
  if (cc->Inputs().HasTag(kInputLandmark)) {
    cc->Inputs().Tag(kInputLandmark).Set<std::vector<NormalizedLandmarkList>>();
  }
  if (cc->Inputs().HasTag(kInputDetection)) {
    cc->Inputs().Tag(kInputDetection).Set<std::vector<Detection>>();
  }
  if (cc->Inputs().HasTag(kInputShotBoundaries)) {
    cc->Inputs().Tag(kInputShotBoundaries).Set<bool>();
  }
  cc->Outputs().Tag(kOutputROI).Set<std::vector<Detection>>();
  if (cc->Outputs().HasTag(kOutputShot)) {
    cc->Outputs().Tag(kOutputShot).Set<bool>();
  }
  if (cc->Outputs().HasTag(kOutputContour)) {
    cc->Outputs().Tag(kOutputContour).Set<ImageFrame>();
  }

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<LipTrackCalculatorOptions>();
  last_shot_timestamp_ = Timestamp(0);
  last_sence_processed_timestamp_ = Timestamp(0);
  pre_dominate_speaker_id_ = -1;
  pre_stop_by_scene_change_ = false;

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  // Processes a scene when shot boundary or time period is larger than min_speaker_span.
  bool is_end_of_scene = false;
  if (cc->Inputs().HasTag(kInputShotBoundaries) &&
      !cc->Inputs().Tag(kInputShotBoundaries).Value().IsEmpty()) {
    is_end_of_scene = cc->Inputs().Tag(kInputShotBoundaries).Get<bool>();
  }


  bool process_scene = !signal_buff_.empty() 
    && (cc->InputTimestamp().Value() - signal_buff_[0].timestamp) >= options_.min_speaker_span()
    || (!signal_buff_.empty() && is_end_of_scene);
  if (process_scene) {
    MP_RETURN_IF_ERROR(ProcessScene(is_end_of_scene, cc));
  }

  if (!cc->Inputs().Tag(kInputVideo).Value().IsEmpty()) {
    // return ::mediapipe::UnknownErrorBuilder(MEDIAPIPE_LOC)
    //       << "No VIDEO input at time " << cc->InputTimestamp().Seconds();

    const auto& frame = cc->Inputs().Tag(kInputVideo).Get<ImageFrame>();
    if (frame_width_ < 0) {
      frame_width_ = frame.Width();
      frame_height_ = frame.Height();
      frame_format_ = frame.Format();
    }
    LipSignal signal;
    mediapipe::formats::MatView(&frame).copyTo(signal.frame);
    signal.timestamp = cc->InputTimestamp().Value();

    if (!cc->Inputs().Tag(kInputLandmark).Value().IsEmpty() && !cc->Inputs().Tag(kInputDetection).Value().IsEmpty()) {
      signal.landmark_lists = 
            cc->Inputs().Tag(kInputLandmark).Get<std::vector<NormalizedLandmarkList>>();
      signal.detections =
            cc->Inputs().Tag(kInputDetection).Get<std::vector<Detection>>(); 
    }
    signal_buff_.push_back(signal);
  }

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::Close(
    ::mediapipe::CalculatorContext* cc) {
  if (!signal_buff_.empty()) {
    MP_RETURN_IF_ERROR(ProcessScene(/* is_end_of_scene = */ false, cc));
  }
  pre_dominate_speaker_detection_.clear();
  face_statistics_inner_.clear();
  face_statistics_outer_.clear();
  meta_face_indices_.clear();

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::ProcessScene(
    bool is_end_of_scene, ::mediapipe::CalculatorContext* cc) {
  // meta_faces: key is the meta face id, value is a vector
  // whose size equals to the current signal_buff_ size. The
  // i_th value in the vector is the face id in the i_th frame. 
  // If a speaker does not appear in a frame, the value is -1.
  std::map<int32, std::vector<int32>> meta_faces;
  int meta_face_count = 0;
  // num_of_active_speaker: key is the meta face id, value is
  // the times that this meta face id is detected as active speakers.
  std::map<int32, int32> num_of_active_speaker;

  // Get the speaker for each frame.
  for (int buff_position = 0; buff_position < signal_buff_.size(); ++buff_position){
    const auto& signal = signal_buff_[buff_position];
    const auto& input_landmark_lists = signal.landmark_lists;
    const auto& input_detections = signal.detections;

    if (input_landmark_lists.empty() || input_detections.empty())
      continue;
  
    std::map<int32, std::deque<float>> cur_face_statistics_inner;
    std::map<int32, std::deque<float>> cur_face_statistics_outer;
    std::vector<int32> cur_meta_face_indices;
    std::vector<float> statistics_inner, statistics_outer;

    MP_RETURN_IF_ERROR(GetStatistics(input_landmark_lists, kLipLeftInnerCornerIdx, kLipRightInnerCornerIdx,
    kLipInnerUpperIdx, kLipInnerLowerIdx, &statistics_inner));
    MP_RETURN_IF_ERROR(GetStatistics(input_landmark_lists, kLipLeftOuterCornerIdx, kLipRightOuterCornerIdx,
    kLipOuterUpperIdx, kLipOuterLowerIdx, &statistics_outer));

    int cur_speaker_id = -1;
    for (int cur_face_idx = 0; cur_face_idx < input_detections.size(); ++cur_face_idx) {
      auto& bbox = input_detections[cur_face_idx];
      // Check whether the face appeared before
      int previous_face_idx = MatchFace(bbox);
      cur_face_statistics_inner.insert(std::pair< int32, std::deque<float> >(cur_face_idx, std::deque<float>()));
      cur_face_statistics_outer.insert(std::pair< int32, std::deque<float> >(cur_face_idx, std::deque<float>()));
      // If the face appeared, add the new data to the previous deque and update meta_faces.
      if (previous_face_idx != -1) {
        // Add previous statistics.
        for (auto& value : face_statistics_inner_[previous_face_idx]) {
          cur_face_statistics_inner[cur_face_idx].push_back(value);
        }
        for (auto& value : face_statistics_outer_[previous_face_idx]) {
          cur_face_statistics_outer[cur_face_idx].push_back(value);
        }
        // Add new statistics.
        cur_face_statistics_inner[cur_face_idx].push_back(statistics_inner[cur_face_idx]);
        while (cur_face_statistics_inner[cur_face_idx].size() > options_.variance_history()) {
          cur_face_statistics_inner[cur_face_idx].pop_front();
        }
        cur_face_statistics_outer[cur_face_idx].push_back(statistics_outer[cur_face_idx]);
        while (cur_face_statistics_outer[cur_face_idx].size() > options_.variance_history()) {
          cur_face_statistics_outer[cur_face_idx].pop_front();
        }
        // Update meta_faces
        int meta_face_idx = meta_face_indices_[previous_face_idx];
        meta_faces[meta_face_idx][buff_position] = cur_face_idx;
        cur_meta_face_indices.push_back(meta_face_idx);
      }
      // If the face did not appear, add the new data and update meta_faces.
      else {
        // Add new statistics.
        cur_face_statistics_inner[cur_face_idx].push_back(statistics_inner[cur_face_idx]);
        cur_face_statistics_outer[cur_face_idx].push_back(statistics_outer[cur_face_idx]);
        // Update meta_faces
        meta_faces.insert(std::pair< int32, std::vector<int32> >(meta_face_count, std::vector<int32>()));
        for (int i = 0; i < signal_buff_.size(); ++i) {
          meta_faces[meta_face_count].push_back(-1);
        }
        meta_faces[meta_face_count][buff_position] = cur_face_idx;
        cur_meta_face_indices.push_back(meta_face_count);
        meta_face_count ++;
      }
      bool is_active_speaker;
      MP_RETURN_IF_ERROR(IsActiveSpeaker(cur_face_statistics_inner[cur_face_idx], 
      cur_face_statistics_outer[cur_face_idx], &is_active_speaker));

      if (is_active_speaker)
        cur_speaker_id = cur_face_idx;
    } // end cur_face_idx
      
    if (cur_speaker_id != -1) {
      int meta_face = cur_meta_face_indices[cur_speaker_id];
      if (num_of_active_speaker.find(meta_face) != num_of_active_speaker.end()) {
        num_of_active_speaker[meta_face]++;
      }
      else {
        num_of_active_speaker.insert(std::pair< int32, int32 >(meta_face, 1));
      }
    }

    // Update the history
    face_bbox_ = input_detections;
    face_statistics_inner_ = cur_face_statistics_inner;
    face_statistics_outer_ = cur_face_statistics_outer;
    speaker_mean_inner_ = 0;
    speaker_variance_inner_ = 0;
    speaker_mean_outer_ = 0;
    speaker_variance_outer_ = 0;
    meta_face_indices_ = cur_meta_face_indices;
  } // end buff_position

  // Find the dominate speaker in the period.
  int32 dominate_speaker_id = -1;
  int32 max_num = 0;
  for (auto it = num_of_active_speaker.begin(); it != num_of_active_speaker.end(); ++it){
    if (it->second > max_num) {
      dominate_speaker_id = it->first;
      max_num = it->second ;
    }
  }

  // No dominate speaker.
  if (dominate_speaker_id == -1) {
    std::vector<NormalizedLandmarkList> empty_landmarklist;
    // Output the shot boundary signal.
    if (cc->Outputs().HasTag(kOutputShot) && options_.output_shot_boundary()) {
        if (is_end_of_scene) {
          Transmit(cc, false, cc->InputTimestamp().Value());
          last_sence_processed_timestamp_ = cc->InputTimestamp();
          pre_stop_by_scene_change_ = true;
        }
        else {
          if (pre_stop_by_scene_change_) {
            Transmit(cc, false, last_sence_processed_timestamp_.Value());
          }
          else {
            Transmit(cc, false, signal_buff_[0].timestamp);
            last_sence_processed_timestamp_ = Timestamp(signal_buff_[0].timestamp);
          }
          pre_stop_by_scene_change_ = false;
        }
    }

    for (int buff_position = 0; buff_position < signal_buff_.size(); ++buff_position) {
      auto empty_detection = ::absl::make_unique<std::vector<Detection>>();
      auto& signal = signal_buff_[buff_position];

      // Optionally output the visualization frames of lit contour and related information.
      if (cc->Outputs().HasTag(kOutputContour)) 
        MP_RETURN_IF_ERROR(OutputVizFrames(empty_landmarklist, *empty_detection.get(),
          *empty_detection.get(), signal.frame, cc, signal.timestamp));
      
      cc->Outputs().Tag(kOutputROI).Add(empty_detection.release(), Timestamp(signal.timestamp));
    }



    //Update history
    pre_dominate_speaker_id_ = dominate_speaker_id;
    pre_dominate_speaker_detection_.clear();
    signal_buff_.clear();
    face_bbox_.clear();
    face_statistics_inner_.clear();
    face_statistics_outer_.clear();
    meta_face_indices_.clear();

    return ::mediapipe::OkStatus();
  }

  // Dominate speaker is detected.
  // Detetion in the closest frame. 
  std::vector<Detection> dominate_speaker_detection;
  auto& dominate_speaker = meta_faces[dominate_speaker_id];
  for (int i = 0; i < dominate_speaker.size(); ++i){
    auto& face_id = dominate_speaker[i];
    if (face_id != -1) { 
      const auto& detection = signal_buff_[i].detections[face_id];
      dominate_speaker_detection.push_back(detection);
      break;
    }
  }

  // Output the shot boundary signal.
  if (cc->Outputs().HasTag(kOutputShot) && options_.output_shot_boundary()) {
    // Detect speakers in current frame and no speakers in previous frame.
    if (pre_dominate_speaker_id_ == -1) {
       if (is_end_of_scene) {
          Transmit(cc, true, cc->InputTimestamp().Value());
          last_shot_timestamp_ = cc->InputTimestamp();
          last_sence_processed_timestamp_ = cc->InputTimestamp();
          pre_stop_by_scene_change_ = true;
        }
        else {
          if (pre_stop_by_scene_change_) {
            Transmit(cc, true, last_sence_processed_timestamp_.Value());
          }
          else {
            Transmit(cc, true, signal_buff_[0].timestamp);
            last_shot_timestamp_ = Timestamp(signal_buff_[0].timestamp);
            last_sence_processed_timestamp_ = Timestamp(signal_buff_[0].timestamp);
          }
          pre_stop_by_scene_change_ = false;
        }
    }
    // Detect speakers in current frame and there are speakers in previous frame.
    else {
      if (!pre_dominate_speaker_detection_.empty()) {
        bool is_speaker_change = 
          (GetIOU(pre_dominate_speaker_detection_[0], dominate_speaker_detection[0]) > options_.iou_threshold()) ? false : true;
        if (is_end_of_scene) {
          Transmit(cc, true, cc->InputTimestamp().Value());
          last_shot_timestamp_ = cc->InputTimestamp();
          last_sence_processed_timestamp_ = cc->InputTimestamp();
          pre_stop_by_scene_change_ = true;
        }
        else if (is_speaker_change) {
          if (pre_stop_by_scene_change_) {
            Transmit(cc, true, last_sence_processed_timestamp_.Value());
          }
          else {
            Transmit(cc, true, signal_buff_[0].timestamp);
            last_shot_timestamp_ = Timestamp(signal_buff_[0].timestamp);
            last_sence_processed_timestamp_ =  Timestamp(signal_buff_[0].timestamp);
          }
          pre_stop_by_scene_change_ = false;
        }
      }
    }
  }

  // Output ROI.
  for (int buff_position = 0; buff_position < signal_buff_.size(); ++buff_position) {
    auto& signal = signal_buff_[buff_position];
    auto& landmark_lists = signal.landmark_lists;
    auto& detections = signal.detections;
    int face_id = dominate_speaker[buff_position];
    auto output_detection = ::absl::make_unique<std::vector<Detection>>();

    // Dominate speaker apears in this frame
    if (face_id != -1) {
      output_detection->push_back(detections[face_id]);
      // Optionally output the visualization frames of lit contour and related information.
      if (cc->Outputs().HasTag(kOutputContour)) 
        MP_RETURN_IF_ERROR(OutputVizFrames(landmark_lists, detections, *output_detection.get(), signal.frame, cc, signal.timestamp));
      // Update dominate_speaker_detection.
      dominate_speaker_detection[0] = detections[face_id];
    }
    else { // Dominate speaker does not appear in this frame
      output_detection->push_back(dominate_speaker_detection[0]);
      std::vector<NormalizedLandmarkList> empty_landmarklist;
      std::vector<Detection> empty_detecton;
      // Optionally output the visualization frames of lit contour and related information.
      if (cc->Outputs().HasTag(kOutputContour)) 
        MP_RETURN_IF_ERROR(OutputVizFrames(empty_landmarklist, 
          empty_detecton, empty_detecton, signal.frame, cc, signal.timestamp));
    }

    cc->Outputs().Tag(kOutputROI).Add(output_detection.release(), Timestamp(signal.timestamp));
  }

  //Update history
  pre_dominate_speaker_id_ = dominate_speaker_id;
  pre_dominate_speaker_detection_.clear();
  pre_dominate_speaker_detection_.push_back(dominate_speaker_detection[0]);
  signal_buff_.clear();
  face_bbox_.clear();
  face_statistics_inner_.clear();
  face_statistics_outer_.clear();
  meta_face_indices_.clear();

  return ::mediapipe::OkStatus(); 
} 

float LipTrackCalculator::GetDistance(const NormalizedLandmark& mark_1,
                                      const NormalizedLandmark& mark_2) {                              
  return std::sqrt(std::pow((mark_1.x()-mark_2.x())*frame_width_, 2) 
  + std::pow((mark_1.y()-mark_2.y())*frame_height_, 2));
}

::mediapipe::Status LipTrackCalculator::GetStatistics(const std::vector<NormalizedLandmarkList>& landmark_lists, 
                    int lip_left_corner, int lip_right_corner, const std::vector<int32>& lip_upper,
                    const std::vector<int32>& lip_lower, std::vector<float>* lip_statistics) {
  float mouth_width = 0.0f, mouth_height = 0.0f;
  for (const auto& landmark_list : landmark_lists) {
    if (landmark_list.landmark_size() < kFaceMeshLandmarks){
      continue;
    }
    mouth_width = GetDistance(landmark_list.landmark(lip_left_corner),
                              landmark_list.landmark(lip_right_corner));
    for (auto i = 0; i < lip_upper.size(); ++i) {
      mouth_height += GetDistance(landmark_list.landmark(lip_upper[i]),
                              landmark_list.landmark(lip_lower[i]));
    }
    // Average the height is better since it may need more points in the future.
    mouth_height /= (float)lip_upper.size();
    lip_statistics->push_back(mouth_height / mouth_width);
  }

  return ::mediapipe::OkStatus();
}

int LipTrackCalculator::MatchFace(const Detection& face_bbox) {
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

cv::Rect2f LipTrackCalculator::DetectionToRect(const Detection& bbox) {
  cv::Rect2f cv_bbox;
  cv_bbox.x = bbox.location_data().relative_bounding_box().xmin();
  cv_bbox.y = bbox.location_data().relative_bounding_box().ymin();
  cv_bbox.width = bbox.location_data().relative_bounding_box().width();
  cv_bbox.height = bbox.location_data().relative_bounding_box().height();

  return cv_bbox;
}

float LipTrackCalculator::GetIOU(const Detection& bbox_1, const Detection& bbox_2) {
  cv::Rect2f cv_bbox_1, cv_bbox_2, intersecting_region, union_region;
  cv_bbox_1 = DetectionToRect(bbox_1);
  cv_bbox_2 = DetectionToRect(bbox_2);

  intersecting_region = cv_bbox_1 & cv_bbox_2;
  union_region = cv_bbox_1 | cv_bbox_2;
  return intersecting_region.area() / union_region.area();
}

void LipTrackCalculator::GetMeanAndVariance(const std::deque<float>& face_lip_statistics,
                      float* mean, float* variance) {
  *mean = 0.0f;
  *variance = 0.0f;                      
  if (face_lip_statistics.size() < options_.mean_history()) {
    *mean = face_lip_statistics[0];
  }
  else {
    for (int i = face_lip_statistics.size()-options_.mean_history(); i < face_lip_statistics.size(); ++i) {
      *mean += face_lip_statistics[i];
    }
    *mean /= (float)options_.mean_history();
  }
  float mean_full = 0.0f;
  for (auto& value : face_lip_statistics)
    mean_full += value;
  mean_full /= (float)face_lip_statistics.size();
  for (auto& value : face_lip_statistics) 
    *variance += std::pow(value - mean_full, 2);
  *variance /= (float)face_lip_statistics.size();
}

::mediapipe::Status LipTrackCalculator::IsActiveSpeaker(
  const std::deque<float>& face_lip_statistics_inner,
  const std::deque<float>& face_lip_statistics_outer, bool* is_speaker) {
  RET_CHECK_EQ(face_lip_statistics_inner.size(), face_lip_statistics_outer.size())
    << "Statistics is not correct.";
  // If a face only appears in a few frames, it's not an active speaker. 
  if (face_lip_statistics_inner.size() <= options_.variance_history() / 2) {
    *is_speaker = false;
    return ::mediapipe::OkStatus();
  }

  float mean_inner = 0.0f, variance_inner = 0.0,
        mean_outer = 0.0f, variance_outer = 0.0;
  GetMeanAndVariance(face_lip_statistics_inner, &mean_inner, &variance_inner);
  GetMeanAndVariance(face_lip_statistics_outer, &mean_outer, &variance_outer);
  
  if ((mean_inner >= options_.lip_inner_mean_threshold_big_mouth() // Inner lip
    && variance_inner >= options_.lip_inner_variance_threshold_big_mouth()
    && mean_inner > speaker_mean_inner_)
    || 
    (mean_inner >= options_.lip_inner_mean_threshold_small_mouth()
    && variance_inner >= options_.lip_inner_variance_threshold_small_mouth()
    && variance_inner > speaker_variance_inner_)
    || // Outer lip
    (mean_outer >= options_.lip_outer_mean_threshold_big_mouth() 
    && variance_outer >= options_.lip_outer_variance_threshold_big_mouth()
    && mean_outer > speaker_mean_outer_)
    || 
    (mean_outer >= options_.lip_outer_mean_threshold_small_mouth()
    && variance_outer >= options_.lip_outer_variance_threshold_small_mouth()
    && variance_outer > speaker_variance_outer_)
    ) {
      speaker_mean_inner_ = mean_inner;
      speaker_variance_inner_ = variance_inner;
      speaker_mean_outer_ = mean_outer;
      speaker_variance_outer_ = variance_outer;
      *is_speaker = true;
      return ::mediapipe::OkStatus();
    }

  *is_speaker = false;
  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::OutputVizFrames(
    const std::vector<NormalizedLandmarkList>& input_landmark_lists,
    const std::vector<Detection>& detected_bbox,
    const std::vector<Detection>& active_speaker_bbox, 
    const cv::Mat& scene_frame, CalculatorContext* cc,
    int64 timestamp) {
  auto viz_frame = absl::make_unique<ImageFrame>(
    frame_format_, scene_frame.cols, scene_frame.rows);
  cv::Mat viz_mat = formats::MatView(viz_frame.get());
  
  scene_frame.copyTo(viz_mat);

  if (!input_landmark_lists.empty()) {
    MP_RETURN_IF_ERROR(DrawLandMarksAndInfor(input_landmark_lists, 
              kGreen, kBlue, &viz_mat));
    // Draw input face bbox
    if (!detected_bbox.empty())
      MP_RETURN_IF_ERROR(DrawBBox(detected_bbox, false, kGreen, &viz_mat));
    // Draw active speaker face bbox
    if (!active_speaker_bbox.empty())
      MP_RETURN_IF_ERROR(DrawBBox(active_speaker_bbox, true, kRed, &viz_mat));
  }

  cc->Outputs().Tag(kOutputContour).Add(viz_frame.release(), Timestamp(timestamp));
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
    std::vector<cv::Point2f> vertices;
    for (auto& idx : kLipInnerContourIdx)
      vertices.push_back(LandmarkToPoint(idx, landmark_list));
    for (int j = 0; j < 8; ++j) {
      // Draw lip landmarks
      cv::circle(*viz_mat, vertices[j], 1, landmark_color, CV_FILLED);
    }
    vertices.clear();
    for (auto& idx : kLipOuterContourIdx)
      vertices.push_back(LandmarkToPoint(idx, landmark_list));
    for (int j = 0; j < 8; ++j) {
      // Draw lip landmarks
      cv::circle(*viz_mat, vertices[j], 1, landmark_color, CV_FILLED);
    }
  }

  return ::mediapipe::OkStatus();
}

::mediapipe::Status LipTrackCalculator::DrawBBox(
    const std::vector<Detection>& bboxes, const bool detected,
    const cv::Scalar& color, cv::Mat* viz_mat) {
  float dx = 0.05, dy = 0.02;
  for(int i = 0; i < bboxes.size(); ++i) {
    auto& face = bboxes[i].location_data().relative_bounding_box();
    std::vector<cv::Point2f> vertices{cv::Point2f(face.xmin()*frame_width_, face.ymin()*frame_height_), 
      cv::Point2f((face.xmin()+face.width())*frame_width_, face.ymin()*frame_height_),
      cv::Point2f((face.xmin()+face.width())*frame_width_, (face.ymin()+face.height())*frame_height_),
      cv::Point2f(face.xmin()*frame_width_, (face.ymin()+face.height())*frame_height_),
    };
    for (int j = 0; j < 4; ++j)
      cv::line(*viz_mat, vertices[j], vertices[(j+1)%4], color, 2);
    if (!detected){
      std::string label = cv::format("Face_%d ", i);
      cv::putText(*viz_mat, label, cv::Point2f(vertices[0].x*(1+dx), vertices[0].y*(1+dy)), cv::FONT_HERSHEY_COMPLEX_SMALL, 0.5, kWhite);
    }
  }
  return ::mediapipe::OkStatus();
}

void LipTrackCalculator::Transmit(mediapipe::CalculatorContext* cc,
          bool is_speaker_change, int64 timestamp) {
  if (last_shot_timestamp_.Seconds() != 0 
      && (Timestamp(timestamp) - last_shot_timestamp_).Seconds() < options_.min_shot_span()) {
    is_speaker_change = false;
  }
  if (is_speaker_change) {
    LOG(INFO) << "Speakers change at: " << Timestamp(timestamp).Seconds()
              << " seconds.";
    cc->Outputs()
        .Tag(kOutputShot)
        .AddPacket(Adopt(std::make_unique<bool>(true).release())
                       .At(Timestamp(timestamp)));
  } else if (!options_.output_shot_boundary_only_on_change()) {
    cc->Outputs()
        .Tag(kOutputShot)
        .AddPacket(Adopt(std::make_unique<bool>(false).release())
                       .At(Timestamp(timestamp)));
  }
}

}  // namespace autoflip
}  // namespace mediapipe

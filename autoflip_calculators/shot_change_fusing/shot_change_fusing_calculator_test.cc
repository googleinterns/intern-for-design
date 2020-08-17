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

#include "absl/strings/string_view.h"
#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/shot_change_fusing_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/calculator_runner.h"
#include "mediapipe/framework/formats/image_frame.h"
#include "mediapipe/framework/formats/image_frame_opencv.h"
#include "mediapipe/framework/port/gmock.h"
#include "mediapipe/framework/port/gtest.h"
#include "mediapipe/framework/port/parse_text_proto.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"
#include "mediapipe/framework/port/status_matchers.h"
#include "mediapipe/framework/formats/rect.pb.h"

using mediapipe::autoflip::DetectionSet;

namespace mediapipe {
namespace autoflip {
namespace {

constexpr char kIsShotBoundaryTag[] = "SHOT_BOUNDARY";
constexpr char kOutputTag[] = "OUTPUT";
const int kScenenum = 2;

// Time stamp
const std::vector<int64> kTimeStamp{2000, 4000};

// Shot change signal
const std::vector<std::vector<bool>> kSignalOneInput{{true}, {false}};
const std::vector<std::vector<bool>> kSignalTwoInput1{{true, false}, {false, false}};
const std::vector<std::vector<bool>> kSignalTwoInput2{{true, false}, {false, true}};
const std::vector<std::vector<bool>> kSignalThreeInput{{true, false, false}, {false, false, false}};


const char kConfigOne[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "shot_change"
    output_stream: "fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
     }
    })";

const char kConfigTwo[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "shot_change"
    input_stream: "speaker_change"
    output_stream: "fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         priority: 0
       }
       shot_settings{
         priority: 1
       }
     }
    })";

const char kConfigThree[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "shot_change"
    input_stream: "speaker_change"
    input_stream: "other_change"
    output_stream: "fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
       shot_settings{
         id: 1
         priority: 1
       }
       shot_settings{
         id: 1
         priority: 2
       }
     }
    })";

const char kConfigSize[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "shot_change"
    input_stream: "speaker_change"
    output_stream: "fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
     }
    })";

const char kConfigTag[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "SHOT_BOUNDARY:0:shot_change"
    input_stream: "SHOT_BOUNDARY:1:speaker_change"
    output_stream: "OUTPUT:fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
       shot_settings{
         id: 1
         priority: 1
       }
     }
    })";

const char kConfigDuplicate[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "SHOT_BOUNDARY:0:shot_change"
    input_stream: "SHOT_BOUNDARY:1:speaker_change"
    output_stream: "OUTPUT:fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
       shot_settings{
         id: 0
         priority: 1
       }
     }
    })";

const char kConfigMissId[] = R"(
    calculator: "ShotChangeFusingCalculator"
    input_stream: "SHOT_BOUNDARY:0:shot_change"
    input_stream: "SHOT_BOUNDARY:1:speaker_change"
    output_stream: "OUTPUT:fusing_change"
    options:{
     [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
       shot_settings{
         id: 0
         priority: 0
       }
       shot_settings{
         priority: 1
       }
     }
    })";

CalculatorGraphConfig::Node MakeConfig(const std::string base_config, 
        const int64 max_scene_size=0) {
  auto config = ParseTextProtoOrDie<CalculatorGraphConfig::Node>(base_config);
    config.mutable_options()
    ->MutableExtension(ShotChangeFusingCalculatorOptions::ext)
    ->set_max_scene_size(max_scene_size);
  return config;
}

void AddScene(const std::vector<bool>& shot_changes, const int64 time_ms, 
            const std::string& tag, CalculatorRunner::StreamContentsSet* inputs) {
  Timestamp timestamp(time_ms);
  // Setup shot change
  for (int i = 0; i < shot_changes.size(); ++i) {
      auto signal = absl::make_unique<bool>();
      *signal = shot_changes[i];
      if (tag != "") {
        inputs->Get(tag, i).packets.push_back(
            Adopt(signal.release()).At(timestamp));
      }
      else {
        inputs->Index(i).packets.push_back(
            Adopt(signal.release()).At(timestamp));
      }
  }
  
}

void SetInputs(const std::vector<std::vector<bool>>& shot_chages_list,
              const std::vector<int64>& time_stamps_ms, const std::string& tag,
              CalculatorRunner* runner) {
  for (int i = 0; i < shot_chages_list.size(); ++i){
    AddScene(shot_chages_list[i], time_stamps_ms[i], tag, runner->MutableInputs());
  }
}

void CheckOutputs(const int32 scene_num, const std::vector<bool>& gt_output,
    const std::string& tag, CalculatorRunner* runner) {
  std::vector<Packet> output_packets;
  if (tag != "") {
    output_packets = runner->Outputs().Tag(tag).packets;
  }
  else {
    output_packets = runner->Outputs().Index(0).packets;
  }
  ASSERT_EQ(scene_num, output_packets.size());
  
  bool signal;
  for (int i = 0; i < scene_num; ++i) {
    signal = output_packets[i].Get<bool>();
    EXPECT_EQ(gt_output[i], signal);
  }
}

// Check one input.
TEST(ShotChangeFusingCalculatorTest, OneInput) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigOne, 0));
  std::string tag;
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalOneInput, kTimeStamp, tag, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kScenenum, gt_output, tag, runner.get());
}

// Check two inputs.
TEST(ShotChangeFusingCalculatorTest, TwoInputs) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigTwo, 0));
  std::string tag;
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalTwoInput1, kTimeStamp, tag, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kScenenum, gt_output, tag, runner.get());
}

// Check Three inputs.
TEST(ShotChangeFusingCalculatorTest, ThreeInputs) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigThree, 0));
  std::string tag;
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalThreeInput, kTimeStamp, tag, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kScenenum, gt_output, tag, runner.get());
}

// Check the case which size doen not equal.
TEST(ShotChangeFusingCalculatorTest, Size) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigSize, 0));
  std::string tag;
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalTwoInput1, kTimeStamp, tag, runner.get());
  ASSERT_FALSE(runner->Run().ok());
}

// Check tag interface.
TEST(ShotChangeFusingCalculatorTest, TagInterface) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigTag, 0));
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalTwoInput1, kTimeStamp, kIsShotBoundaryTag, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(kScenenum, gt_output, kOutputTag, runner.get());
}

// Check duplicate.
TEST(ShotChangeFusingCalculatorTest, DuplicateId) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigDuplicate, 0));
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalTwoInput1, kTimeStamp, kIsShotBoundaryTag, runner.get());
  ASSERT_FALSE(runner->Run().ok());
} 

// Check miss ID.
TEST(ShotChangeFusingCalculatorTest, MissId) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigMissId, 0));
  std::vector<bool> gt_output{true, false};
  SetInputs(kSignalTwoInput1, kTimeStamp, kIsShotBoundaryTag, runner.get());
  ASSERT_FALSE(runner->Run().ok());
}

// Check priority and max_scene_size.
TEST(ShotChangeFusingCalculatorTest, PriorityAndMaxSceneSize) {
  auto runner = ::absl::make_unique<CalculatorRunner>(MakeConfig(kConfigTwo, 1));
  std::string tag;
  int32 scene_num = 1;
  std::vector<bool> gt_output{true};
  SetInputs(kSignalTwoInput2, kTimeStamp, tag, runner.get());
  MP_ASSERT_OK(runner->Run());
  CheckOutputs(scene_num, gt_output, tag, runner.get());
}


}  // namespace
}  // namespace autoflip
}  // namespace mediapipe

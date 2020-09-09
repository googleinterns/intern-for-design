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

#include "mediapipe/examples/desktop/autoflip/autoflip_messages.pb.h"
#include "mediapipe/examples/desktop/autoflip/calculators/shot_change_fusing_calculator.pb.h"
#include "mediapipe/framework/calculator_framework.h"
#include "mediapipe/framework/port/ret_check.h"
#include "mediapipe/framework/port/status.h"

using mediapipe::Packet;
using mediapipe::PacketTypeSet;

constexpr char kIsShotBoundaryTag[] = "SHOT_BOUNDARY";
constexpr char kOutputTag[] = "OUTPUT";

namespace mediapipe {
namespace autoflip {

struct ShotSignal {
  bool shot_change_signal = false;
  int priority = std::numeric_limits<int>::max();
  mediapipe::Timestamp time;
};

// This calculator takes an arbitrary number of kinds of shot change
// signals (i.e., static shot change and speaker shot change) and
// outputs a combined shot change signal. The input signals should
// be in ordered.
//
// Example (ordered interface):
//  node {
//    calculator: "ShotChangeFusingCalculator"
//    input_stream: "shot_change"
//    input_stream: "speaker_change"
//    output_stream: "fusing_change"
//    options:{
//      [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
//        shot_settings{
//          id: 0 (optional)
//          priority: 0
//        }
//        shot_settings{
//          id: 1 (optional)
//          priority: 1
//        }
//      }
//    }
//  }
//
// Example (tag interface):
//  node {
//    calculator: "ShotChangeFusingCalculator"
//    input_stream: "SHOT_BOUNDARY:0:shot_change"
//    input_stream: "SHOT_BOUNDARY:1:speaker_change"
//    output_stream: "OUTPUT:fusing_change"
//    options:{
//      [mediapipe.autoflip.ShotChangeFusingCalculatorOptions.ext]:{
//        shot_settings{
//          id: 0 (required)
//          priority: 0
//        }
//        shot_settings{
//          id: 1 (required)
//          priority: 1
//        }
//      }
//    }
//  }

class ShotChangeFusingCalculator : public mediapipe::CalculatorBase {
 public:
  ShotChangeFusingCalculator()
      : tag_input_interface_(false) {} //, process_by_scene_(true) {}
  ShotChangeFusingCalculator(const ShotChangeFusingCalculator&) = delete;
  ShotChangeFusingCalculator& operator=(const ShotChangeFusingCalculator&) = delete;

  static ::mediapipe::Status GetContract(mediapipe::CalculatorContract* cc);
  mediapipe::Status Open(mediapipe::CalculatorContext* cc) override;
  mediapipe::Status Process(mediapipe::CalculatorContext* cc) override;
  mediapipe::Status Close(mediapipe::CalculatorContext* cc) override;

 private:
  mediapipe::Status ProcessScene(mediapipe::CalculatorContext* cc);
  std::vector<Packet> GetSignalPackets(mediapipe::CalculatorContext* cc);
  void Transmit(mediapipe::CalculatorContext* cc, const int position);
  ShotChangeFusingCalculatorOptions options_;
  // Key is the id and value is the priority
  std::map<int32, int32> priority_;
  std::vector<ShotSignal> shot_signals_;
  bool tag_input_interface_;
  // Last time a shot was detected.
  Timestamp last_shot_timestamp_;
};

REGISTER_CALCULATOR(ShotChangeFusingCalculator);

namespace {
void SetupTagInput(mediapipe::CalculatorContract* cc) {
  for (int i = 0; i < cc->Inputs().NumEntries(kIsShotBoundaryTag); ++i) {
    cc->Inputs().Get(kIsShotBoundaryTag, i).Set<bool>();
  }
  cc->Outputs().Tag(kOutputTag).Set<bool>();
}

void SetupOrderedInput(mediapipe::CalculatorContract* cc) {
  for (int i = 0; i < cc->Inputs().NumEntries(); ++i) {
    cc->Inputs().Index(i).Set<bool>();
  }
  cc->Outputs().Index(0).Set<bool>();
}
}  // namespace

::mediapipe::Status ShotChangeFusingCalculator::GetContract(
    mediapipe::CalculatorContract* cc) {
  if (cc->Inputs().NumEntries(kIsShotBoundaryTag) > 0) {
    SetupTagInput(cc);
  } else {
    SetupOrderedInput(cc);
  }
  return ::mediapipe::OkStatus();
}

mediapipe::Status ShotChangeFusingCalculator::Open(
    mediapipe::CalculatorContext* cc) {
  options_ = cc->Options<ShotChangeFusingCalculatorOptions>();
  RET_CHECK_EQ(options_.shot_settings().size(), cc->Inputs().NumEntries())
    << "The number of signals does not equal to the number of signal settings.";

  if (cc->Inputs().HasTag(kIsShotBoundaryTag)) {
    tag_input_interface_ = true;
  }
  for (int count = 0; count < options_.shot_settings().size(); ++count) {
    const auto& setting = options_.shot_settings()[count];
    if (tag_input_interface_) {
      RET_CHECK(setting.id() >= 0) 
        << "Shot change ID is missing or ID is negative in tag interface. Please use non-negative ID.";
      RET_CHECK(priority_.find(setting.id()) ==  priority_.end())
        << "Duplicate shot change id: " << setting.id();
      priority_[setting.id()] = setting.priority();
    }
    else {
      priority_[count] = setting.priority();
    }
  }

  last_shot_timestamp_ = Timestamp(0);

  return ::mediapipe::OkStatus();
}

mediapipe::Status ShotChangeFusingCalculator::Process(
    mediapipe::CalculatorContext* cc) {
  // Flush bufferif it exceeds min_shot_span.
  if (!shot_signals_.empty() 
    && (cc->InputTimestamp() - shot_signals_[0].time).Seconds() > options_.min_shot_span()) {
    MP_RETURN_IF_ERROR(ProcessScene(cc));
  }

  ShotSignal signal;
  const auto& signal_packets = GetSignalPackets(cc);
  for (int i = 0; i < signal_packets.size(); ++i) {
    const auto& packet = signal_packets[i];
    if (packet.IsEmpty()) {
      continue;
    }
    const bool boundary = packet.Get<bool>();
    signal.shot_change_signal = signal.shot_change_signal || boundary;
    // Keep the highest priority.
    signal.priority = std::min(signal.priority, priority_[i]);
  }
  // Store the signal only when there is input and there is a shot change.
  if (signal.priority != std::numeric_limits<int>::max() && signal.shot_change_signal) {
    signal.time = cc->InputTimestamp();
    shot_signals_.push_back(signal);
  }

  return ::mediapipe::OkStatus();
}

mediapipe::Status ShotChangeFusingCalculator::Close(
    mediapipe::CalculatorContext* cc) {
  if (!shot_signals_.empty()) {
    MP_RETURN_IF_ERROR(ProcessScene(cc));
  }
  priority_.clear();
  return ::mediapipe::OkStatus();
}

mediapipe::Status ShotChangeFusingCalculator::ProcessScene(
    mediapipe::CalculatorContext* cc) {
  int high_position = -1;
  int high_priority = std::numeric_limits<int>::max();

  for (int position = 0; position < shot_signals_.size(); ++position) {
    auto signal = shot_signals_[position];
    if (signal.priority <= high_priority) {
        high_priority = signal.priority;
        high_position = position;
    }
  }

  Transmit(cc, high_position);
  last_shot_timestamp_ = shot_signals_[high_position].time;

  shot_signals_.clear();
  return ::mediapipe::OkStatus();
}

std::vector<Packet> ShotChangeFusingCalculator::GetSignalPackets(
    mediapipe::CalculatorContext* cc) {
  std::vector<Packet> signal_packets;
  if (tag_input_interface_) {
    for (int i = 0; i < cc->Inputs().NumEntries(kIsShotBoundaryTag); ++i) {
      const auto& packet = cc->Inputs().Get(kIsShotBoundaryTag, i).Value();
      signal_packets.push_back(packet);
    }
  } else {
    for (int i = 0; i < cc->Inputs().NumEntries(); ++i) {
      const auto& packet = cc->Inputs().Index(i).Value();
      signal_packets.push_back(packet);
    }
  }
  return signal_packets;
}

void ShotChangeFusingCalculator::Transmit(
            mediapipe::CalculatorContext* cc, const int position) {
  auto output_signal = ::absl::make_unique<bool>();
  *output_signal = shot_signals_[position].shot_change_signal;
  Timestamp time =  shot_signals_[position].time;
  if (*output_signal) {
    LOG(INFO) << "Fusing Shot change at: " << time.Seconds()
          << " seconds.";

    if (tag_input_interface_) {
      cc->Outputs().Tag(kOutputTag)
          .Add(output_signal.release(), time);
      } 
    else
      cc->Outputs().Index(0).Add(output_signal.release(), time);
  }
}

}  // namespace autoflip
}  // namespace mediapipe

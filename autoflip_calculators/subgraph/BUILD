mediapipe_simple_subgraph(
    name = "autoflip_active_speaker_detection_subgraph",
    graph = "autoflip_active_speaker_detection_subgraph.pbtxt",
    register_as = "AutoFlipActiveSpeakerDetectionSubgraph",
    visibility = ["//visibility:public"],
    deps = [
        "//mediapipe/calculators/core:constant_side_packet_calculator",
        "//mediapipe/modules/face_landmark:face_landmark_front_cpu",
        "//mediapipe/examples/desktop/autoflip/calculators:lip_track_calculator",
    ],
)

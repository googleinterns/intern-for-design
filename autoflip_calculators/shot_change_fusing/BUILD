cc_library(
    name = "shot_change_fusing_calculator",
    srcs = ["shot_change_fusing_calculator.cc"],
    deps = [
        ":shot_change_fusing_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
    ],
    alwayslink = 1,
)

proto_library(
    name = "shot_change_fusing_calculator_proto",
    srcs = ["shot_change_fusing_calculator.proto"],
    deps = [
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_proto",
        "//mediapipe/framework:calculator_proto",
    ],
)

mediapipe_cc_proto_library(
    name = "shot_change_fusing_calculator_cc_proto",
    srcs = ["shot_change_fusing_calculator.proto"],
    cc_deps = [
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_cc_proto",
    ],
    visibility = ["//mediapipe/examples:__subpackages__"],
    deps = [":shot_change_fusing_calculator_proto"],
)

cc_test(
    name = "shot_change_fusing_calculator_test",
    srcs = ["shot_change_fusing_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":shot_change_fusing_calculator",
        ":shot_change_fusing_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/port:gtest_main",
        "//mediapipe/framework/port:parse_text_proto",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/strings",
        "//mediapipe/framework/formats:rect_cc_proto",
    ],
)

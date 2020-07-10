cc_library(
    name = "text_detection_calculator",
    srcs = ["text_detection_calculator.cc"],
    deps = [
        ":text_detection_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/formats:location_data_cc_proto",
        "//mediapipe/framework/port:opencv_core",
        "//mediapipe/framework/port:opencv_imgproc",
        "//mediapipe/framework/port:opencv_dnn",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/memory",
    ],
    alwayslink = 1,
)

proto_library(
    name = "text_detection_calculator_proto",
    srcs = ["text_detection_calculator.proto"],
    deps = [
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer_proto",
        "//mediapipe/framework:calculator_proto",
    ],
)

mediapipe_cc_proto_library(
    name = "text_detection_calculator_cc_proto",
    srcs = ["text_detection_calculator.proto"],
    cc_deps = [
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer_cc_proto",
        "//mediapipe/framework:calculator_cc_proto",
    ],
    visibility = ["//mediapipe/examples:__subpackages__"],
    deps = [":text_detection_calculator_proto"],
)

cc_test(
    name = "text_detection_calculator_test",
    srcs = ["text_detection_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":text_detection_calculator",
        ":text_detection_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/formats:location_data_cc_proto",
        "//mediapipe/framework/port:gtest_main",
        "//mediapipe/framework/port:parse_text_proto",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "//mediapipe/framework/port:opencv_highgui",
        "@com_google_absl//absl/strings",
    ],
)

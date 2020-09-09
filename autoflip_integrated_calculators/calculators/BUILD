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
        "//mediapipe/framework/port:opencv_video",
        "@com_google_absl//absl/strings",
    ],
)

cc_library(
    name = "lip_track_calculator",
    srcs = ["lip_track_calculator.cc"],
    deps = [
        ":lip_track_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:landmark_cc_proto",
        "//mediapipe/framework/formats:rect_cc_proto",
        "//mediapipe/framework/port:opencv_core",
        "//mediapipe/framework/port:opencv_imgproc",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/memory",
    ],
    alwayslink = 1,
)

proto_library(
    name = "lip_track_calculator_proto",
    srcs = ["lip_track_calculator.proto"],
    deps = [
        "//mediapipe/framework:calculator_proto",
    ],
)

mediapipe_cc_proto_library(
    name = "lip_track_calculator_cc_proto",
    srcs = ["lip_track_calculator.proto"],
    cc_deps = [
        "//mediapipe/framework:calculator_cc_proto",
    ],
    visibility = ["//mediapipe/examples:__subpackages__"],
    deps = [":lip_track_calculator_proto"],
)

cc_test(
    name = "lip_track_calculator_test",
    srcs = ["lip_track_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":lip_track_calculator",
        ":lip_track_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/formats:landmark_cc_proto",
        "//mediapipe/framework/formats:rect_cc_proto",
        "//mediapipe/framework/formats:location_data_cc_proto",
        "//mediapipe/framework/port:gtest_main",
        "//mediapipe/framework/port:parse_text_proto",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/strings",
    ],
)

cc_library(
    name = "active_speaker_to_region_calculator",
    srcs = ["active_speaker_to_region_calculator.cc"],
    deps = [
        ":active_speaker_to_region_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/formats:rect_cc_proto",
        "//mediapipe/framework/formats:location_data_cc_proto",
        "//mediapipe/framework/port:opencv_core",
        "//mediapipe/framework/port:opencv_imgproc",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/memory",
    ],
    alwayslink = 1,
)

proto_library(
    name = "active_speaker_to_region_calculator_proto",
    srcs = ["active_speaker_to_region_calculator.proto"],
    deps = [
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer_proto",
        "//mediapipe/framework:calculator_proto",
    ],
)

mediapipe_cc_proto_library(
    name = "active_speaker_to_region_calculator_cc_proto",
    srcs = ["active_speaker_to_region_calculator.proto"],
    cc_deps = [
        "//mediapipe/examples/desktop/autoflip/quality:visual_scorer_cc_proto",
        "//mediapipe/framework:calculator_cc_proto",
    ],
    visibility = ["//mediapipe/examples:__subpackages__"],
    deps = [":active_speaker_to_region_calculator_proto"],
)

cc_test(
    name = "active_speaker_to_region_calculator_test",
    srcs = ["active_speaker_to_region_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":active_speaker_to_region_calculator",
        ":active_speaker_to_region_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/formats:detection_cc_proto",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/formats:location_data_cc_proto",
        "//mediapipe/framework/formats:rect_cc_proto",
        "//mediapipe/framework/port:gtest_main",
        "//mediapipe/framework/port:parse_text_proto",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "@com_google_absl//absl/strings",
    ],
)

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

cc_library(
    name = "pad_lapped_tensor_buffer_calculator",
    srcs = ["pad_lapped_tensor_buffer_calculator.cc"],
    visibility = ["//visibility:public"],
    deps = [
        ":pad_lapped_tensor_buffer_calculator_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "//mediapipe/framework/profiler:circular_buffer",
        "@com_google_absl//absl/memory",
        "@com_google_absl//absl/types:span",
        "@org_tensorflow//tensorflow/core:framework",
        "@org_tensorflow//tensorflow/core:lib",
    ],
    alwayslink = 1,
)

proto_library(
    name = "pad_apped_tensor_buffer_calculator_proto",
    srcs = ["pad_lapped_tensor_buffer_calculator.proto"],
    visibility = ["//visibility:public"],
    deps = ["//mediapipe/framework:calculator_proto"],
)

mediapipe_cc_proto_library(
    name = "pad_lapped_tensor_buffer_calculator_cc_proto",
    srcs = ["pad_lapped_tensor_buffer_calculator.proto"],
    cc_deps = ["//mediapipe/framework:calculator_cc_proto"],
    visibility = ["//visibility:public"],
    deps = [":pad_lapped_tensor_buffer_calculator_proto"],
)

cc_test(
    name = "pad_lapped_tensor_buffer_calculator_test",
    size = "small",
    srcs = ["pad_lapped_tensor_buffer_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":pad_lapped_tensor_buffer_calculator",
        ":pad_lapped_tensor_buffer_calculator_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/port:gtest_main",
        "@com_google_absl//absl/memory",
        "@org_tensorflow//tensorflow/core:framework",
        "@org_tensorflow//tensorflow/core:protos_all_cc",
    ],
)

cc_library(
    name = "shot_boundary_decoder_calculator",
    srcs = ["shot_boundary_decoder_calculator.cc"],
    visibility = ["//visibility:public"],
    deps = [
        ":shot_boundary_decoder_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:timestamp",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
    ],
    alwayslink = 1,
)

proto_library(
    name = "shot_boundary_decoder_calculator_proto",
    srcs = ["shot_boundary_decoder_calculator.proto"],
    visibility = ["//visibility:public"],
    deps = ["//mediapipe/framework:calculator_proto"],
)

mediapipe_cc_proto_library(
    name = "shot_boundary_decoder_calculator_cc_proto",
    srcs = ["shot_boundary_decoder_calculator.proto"],
    cc_deps = ["//mediapipe/framework:calculator_cc_proto"],
    visibility = ["//visibility:public"],
    deps = [":shot_boundary_decoder_calculator_proto"],
)

cc_test(
    name = "shot_boundary_decoder_calculator_test",
    srcs = ["shot_boundary_decoder_calculator_test.cc"],
    linkstatic = 1,
    deps = [
        ":shot_boundary_decoder_calculator",
        ":shot_boundary_decoder_calculator_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:calculator_runner",
        "//mediapipe/framework/port:gtest_main",
        "@com_google_absl//absl/memory",
    ],
)

cc_library(
    name = "shot_boundary_visualization_calculator",
    srcs = ["shot_boundary_visualization_calculator.cc"],
    visibility = ["//visibility:public"],
    deps = [
        ":shot_boundary_visualization_calculator_cc_proto",
        "//mediapipe/examples/desktop/autoflip:autoflip_messages_cc_proto",
        "//mediapipe/framework:calculator_framework",
        "//mediapipe/framework:timestamp",
        "//mediapipe/framework/port:ret_check",
        "//mediapipe/framework/port:status",
        "//mediapipe/framework/formats:image_frame",
        "//mediapipe/framework/formats:image_frame_opencv",
        "//mediapipe/framework/port:opencv_imgproc",
    ],
    alwayslink = 1,
)

proto_library(
    name = "shot_boundary_visualization_calculator_proto",
    srcs = ["shot_boundary_visualization_calculator.proto"],
    visibility = ["//visibility:public"],
    deps = ["//mediapipe/framework:calculator_proto"],
)

mediapipe_cc_proto_library(
    name = "shot_boundary_visualization_calculator_cc_proto",
    srcs = ["shot_boundary_visualization_calculator.proto"],
    cc_deps = ["//mediapipe/framework:calculator_cc_proto"],
    visibility = ["//visibility:public"],
    deps = [":shot_boundary_visualization_calculator_proto"],
)

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

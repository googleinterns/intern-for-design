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
        "//mediapipe/framework/port:status"
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

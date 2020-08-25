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

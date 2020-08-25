mediapipe_simple_subgraph(
    name = "autoflip_shot_boundary_detection_subgraph",
    graph = "autoflip_shot_boundary_detection_subgraph.pbtxt",
    register_as = "AutoFlipShotBoundaryDetectionSubgraph",
    visibility = ["//visibility:public"],
    deps = [
        "//mediapipe/calculators/image:image_transformation_calculator",
        "//mediapipe/calculators/tensorflow:image_frame_to_tensor_calculator",
        "//mediapipe/examples/desktop/autoflip/calculators:pad_lapped_tensor_buffer_calculator",
        "//mediapipe/calculators/tensorflow:tensorflow_session_from_saved_model_calculator",
        "//mediapipe/calculators/tensorflow:tensorflow_inference_calculator",
        "//mediapipe/calculators/tensorflow:tensor_to_vector_float_calculator",
        "//mediapipe/calculators/tensorflow:tensor_squeeze_dimensions_calculator",
        "//mediapipe/examples/desktop/autoflip/calculators:shot_boundary_decoder_calculator",
        "@org_tensorflow//tensorflow/core:all_kernels",
        "@org_tensorflow//tensorflow/core:direct_session",
    ],
)

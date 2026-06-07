// Example orchestration for custom/image-prototype-v3.
export default {
  agentId: "custom/image-prototype-v3",
  recipeRef: "image-gen/prototype-v1",
  steps: [
    { id: "image_gen_via_relay", kind: "skill" },
  ],
};

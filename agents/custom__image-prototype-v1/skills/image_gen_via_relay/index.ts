interface SkillInput {
  prompt: string;
  count?: number;
  raw_prompt?: boolean;
}

export default async function run(input: SkillInput) {
  const count = input.count ?? 3;
  return {
    ok: true,
    output: {
      artifacts: [],
      metadata: {
        agent_id: "custom/image-prototype-v1",
        prompt_used: input.prompt,
        count,
        dry_run: true,
      },
    },
  };
}

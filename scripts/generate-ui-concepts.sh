#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NODE_BIN="${MOYU_NODE_BIN:-/Users/zlj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="node"
fi

CLI=("$NODE_BIN" "node_modules/tsx/dist/cli.mjs" "src/cli.ts")

if [[ ! -f ".env" ]]; then
  echo "Missing .env. Create it from .env.example and fill MOYU_IMAGE_PROVIDER_API_KEY first." >&2
  exit 1
fi

if ! grep -q "^MOYU_IMAGE_PROVIDER_API_KEY=" ".env"; then
  echo "Missing MOYU_IMAGE_PROVIDER_API_KEY in .env." >&2
  exit 1
fi

if grep -q "^MOYU_IMAGE_PROVIDER_API_KEY=your_api_key_here" ".env"; then
  echo "MOYU_IMAGE_PROVIDER_API_KEY is still a placeholder. Fill a valid relay key first." >&2
  exit 1
fi

run_one() {
  local slug="$1"
  local prompt="$2"
  local out_dir="artifacts/ui-concepts/${slug}"

  echo
  echo "============================================================"
  echo "Generating ${slug}"
  echo "Output: ${out_dir}"
  echo "============================================================"

  local output
  output="$("${CLI[@]}" agent run image-gen/prototype-v1 \
    --prompt "$prompt" \
    --count 1 \
    --size 1024x1024 \
    --raw-prompt \
    --out "$out_dir")"

  printf "%s\n" "$output"

  local run_id
  run_id="$(printf "%s\n" "$output" | awk -F': ' '/^run_id:/ {print $2; exit}')"
  if [[ -z "$run_id" ]]; then
    echo "Could not parse run_id for ${slug}." >&2
    exit 1
  fi

  echo
  echo "Run check: ${run_id}"
  "${CLI[@]}" run show "$run_id"

  echo
  echo "Artifact check: ${run_id}"
  "${CLI[@]}" artifact list --run "$run_id"
}

WORKBENCH_BASE="High-fidelity desktop app UI mockup for Moyu, a local-first AI agent platform. Main workbench screen. Left sidebar Agent Library, center prompt input and generated image preview, right Run Trace inspector, bottom Artifact gallery. Serious modern productivity tool, light mode, compact information density, ink black and muted cyan accents, subtle cuttlefish ink logo identity, 8px radius, crisp typography. Avoid marketing landing page, purple gradients, glassmorphism, decorative orbs, childish mascot. Realistic readable English UI labels."

CANVAS_BASE="High-fidelity desktop app UI mockup for Moyu future Agent Workflow Canvas mode. Center node canvas with connected nodes: Prompt Input, Image Generation Agent, Artifact Writer, Trace Validator. Left sidebar Agents, Recipes, Skills, Artifacts. Right panel selected node settings and permissions. Bottom panel run logs, step timeline, errors, artifacts. Serious local-first developer tool, light mode, ink black and muted cyan accents, compact and readable, subtle cuttlefish ink brand identity. Avoid marketing page, purple gradients, decorative orbs, childish mascot. Production-ready UI screenshot."

ARTIFACT_BASE="High-fidelity desktop app UI mockup for Moyu Artifact Detail View. Large generated image preview in main area. Left navigation sidebar with Agent Library, Runs, Artifacts, Settings. Right metadata panel shows artifact id, run id, agent id, png type, size, sha256, local path, created time. Below preview show trace provenance timeline and producing agent step. Top actions: Open, Reveal in Finder, Export Trace Bundle, Regenerate. Serious professional productivity app, light mode, compact technical metadata, ink black and muted cyan accents, subtle cuttlefish ink logo identity. Avoid marketing page, purple gradients, glassmorphism, decorative orbs, childish mascot."

run_one "workbench-01" "${WORKBENCH_BASE} Variation 1: balanced dashboard layout, dense but calm, strongest emphasis on current run and artifact preview."
run_one "workbench-02" "${WORKBENCH_BASE} Variation 2: more IDE-like layout, stronger trace inspector, clearer run state timeline and local sandbox status."
run_one "workbench-03" "${WORKBENCH_BASE} Variation 3: more creator-friendly layout, larger image preview, compact prompt controls, artifact gallery feels easy to scan."

run_one "canvas-01" "${CANVAS_BASE} Variation 1: clean node graph with four large readable nodes and clear edge flow."
run_one "canvas-02" "${CANVAS_BASE} Variation 2: debugging-first canvas, selected node inspector prominent, bottom logs detailed but tidy."
run_one "canvas-03" "${CANVAS_BASE} Variation 3: workflow builder with agent library and reusable skills, polished no-code builder feel."

run_one "artifact-detail-01" "${ARTIFACT_BASE} Variation 1: preview-first detail page with metadata on the right and trace below."
run_one "artifact-detail-02" "${ARTIFACT_BASE} Variation 2: provenance-first detail page, strong trace timeline and artifact verification fields."
run_one "artifact-detail-03" "${ARTIFACT_BASE} Variation 3: review workflow page, image comparison area, regenerate and export actions visible."

echo
echo "Done. UI concept outputs are under artifacts/ui-concepts/."

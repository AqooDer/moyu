(function attachMoyuInstallModule(global) {
  function formatInstallConflict(data, dict) {
    const parts = [dict.installConflict];
    appendLabelValue(parts, dict.conflictAgentLabel, data?.agentId);
    appendLabelValue(parts, dict.conflictSourceLabel, data?.sourcePath);
    appendLabelValue(parts, dict.conflictTargetLabel, data?.targetPath);

    const createVersion = data?.nextActions?.createVersion;
    if (createVersion?.proposedAgentId) {
      appendLabelValue(parts, dict.conflictVersionLabel, createVersion.proposedAgentId);
    }
    if (createVersion?.proposedTargetPath) {
      appendLabelValue(parts, dict.conflictVersionTargetLabel, createVersion.proposedTargetPath);
    }

    const diff = data?.diffSummary || data?.nextActions?.viewDiff?.summary;
    if (diff) {
      appendLabelValue(parts, dict.conflictDiffLabel, formatDiffSummary(diff, dict));
    }

    parts.push(dict.installConflictAction);
    return parts.filter(Boolean).join("\n");
  }

  function getCreateVersionAction(conflict) {
    const action = conflict?.nextActions?.createVersion;
    if (!action?.endpoint || action.method !== "POST") {
      return null;
    }
    return action;
  }

  function getViewDiffAction(conflict) {
    const action = conflict?.nextActions?.viewDiff;
    if (!action?.endpoint || action.method !== "GET") {
      return null;
    }
    return action;
  }

  function canCreateInstallVersion(input) {
    return Boolean(
      input?.apiAvailable &&
        input?.selectedRunId &&
        !input?.isInstalling &&
        getCreateVersionAction(input?.conflict),
    );
  }

  function canViewInstallDiff(input) {
    return Boolean(input?.apiAvailable && !input?.isInstalling && getViewDiffAction(input?.conflict));
  }

  function formatDiffSummary(diff, dict) {
    const labels = {
      sourceOnly: dict.diffSourceOnly || "source only",
      targetOnly: dict.diffTargetOnly || "target only",
      changed: dict.diffChanged || "changed",
      unchanged: dict.diffUnchanged || "unchanged",
    };
    return ["sourceOnly", "targetOnly", "changed", "unchanged"]
      .filter((key) => Number.isFinite(Number(diff[key])))
      .map((key) => `${labels[key]} ${Number(diff[key])}`)
      .join(" · ");
  }

  function formatDiffFileList(diff, dict) {
    if (!diff || typeof diff !== "object") {
      return "";
    }
    const files = diff.files || {};
    const sections = [
      ["changed", dict.diffChanged || "changed"],
      ["sourceOnly", dict.diffSourceOnly || "source only"],
      ["targetOnly", dict.diffTargetOnly || "target only"],
      ["unchanged", dict.diffUnchanged || "unchanged"],
    ];
    const lines = [];
    if (diff.agentId) {
      lines.push(`${dict.conflictAgentLabel || "Agent"}: ${diff.agentId}`);
    }
    if (diff.sourcePath) {
      lines.push(`${dict.conflictSourceLabel || "Source"}: ${diff.sourcePath}`);
    }
    if (diff.targetPath) {
      lines.push(`${dict.conflictTargetLabel || "Target"}: ${diff.targetPath}`);
    }
    if (diff.summary) {
      lines.push(`${dict.conflictDiffLabel || "Diff"}: ${formatDiffSummary(diff.summary, dict)}`);
    }
    for (const [key, label] of sections) {
      const values = Array.isArray(files[key]) ? files[key] : [];
      lines.push("");
      lines.push(`${label} (${values.length})`);
      if (values.length === 0) {
        lines.push(`  ${dict.diffNoFiles || "No files"}`);
      } else {
        values.forEach((filePath) => lines.push(`  - ${filePath}`));
      }
    }
    return lines.join("\n");
  }

  function appendLabelValue(parts, label, value) {
    if (typeof value === "string" && value.trim()) {
      parts.push(`${label}: ${value}`);
    }
  }

  global.MoyuInstallModule = {
    formatInstallConflict,
    getCreateVersionAction,
    getViewDiffAction,
    canCreateInstallVersion,
    canViewInstallDiff,
    formatDiffSummary,
    formatDiffFileList,
  };
})(typeof window === "undefined" ? globalThis : window);

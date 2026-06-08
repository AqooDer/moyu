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

  function canCreateInstallVersion(input) {
    return Boolean(
      input?.apiAvailable &&
        input?.selectedRunId &&
        !input?.isInstalling &&
        getCreateVersionAction(input?.conflict),
    );
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

  function appendLabelValue(parts, label, value) {
    if (typeof value === "string" && value.trim()) {
      parts.push(`${label}: ${value}`);
    }
  }

  global.MoyuInstallModule = {
    formatInstallConflict,
    getCreateVersionAction,
    canCreateInstallVersion,
    formatDiffSummary,
  };
})(typeof window === "undefined" ? globalThis : window);

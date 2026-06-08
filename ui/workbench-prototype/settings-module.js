(function attachMoyuSettingsModule(global) {
  function parseSettingsHash(hashValue) {
    const hash = String(hashValue || "").replace(/^#/, "");
    const [route, rawSection] = hash.split("/");
    if (route !== "settings") {
      return { view: "conversation", sectionId: "" };
    }

    return {
      view: "settings",
      sectionId: safeDecode(rawSection || "overview"),
    };
  }

  function toSettingsHash(sectionId) {
    return `#settings/${encodeURIComponent(sectionId || "overview")}`;
  }

  function normalizeSettingsPayload(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }
    if (payload.settings && typeof payload.settings === "object") {
      return payload.settings;
    }
    if (Array.isArray(payload.nav)) {
      return payload;
    }
    return null;
  }

  function resolveSettingsRenderState(input) {
    const status = input && input.status ? input.status : "idle";
    const settings = input ? input.settings : null;
    if (status === "loading") {
      return "loading";
    }
    if (status === "error") {
      return "error";
    }
    if (!settings || !Array.isArray(settings.nav) || settings.nav.length === 0) {
      return "empty";
    }
    return "ready";
  }

  function shouldUsePreviewSettingsFallback(input) {
    const status = input && input.status ? input.status : "idle";
    if (status === "error") {
      return true;
    }
    return !Boolean(input && input.canUseLocalApi) || !Boolean(input && input.apiAvailable);
  }

  function getCapabilityDetailRows(item) {
    if (!item || typeof item !== "object") {
      return [];
    }
    return [
      { kind: "text", labelKey: "scopeLabel", value: item.scope },
      { kind: "text", labelKey: "sourceLabel", value: item.source },
      { kind: "text", labelKey: "sourceTypeLabel", value: item.sourceType },
      { kind: "text", labelKey: "permissionBoundaryLabel", value: item.permissionBoundary },
      { kind: "text", labelKey: "approvalLabel", value: item.approval },
      { kind: "tags", labelKey: "defaultEnabledForLabel", value: item.defaultEnabledFor },
      { kind: "text", labelKey: "riskLevelLabel", value: item.riskLevel },
    ].filter((row) => hasCapabilityRowValue(row.value));
  }

  function hasCapabilityRowValue(value) {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (value && typeof value === "object") {
      return Boolean(value.zh || value.en);
    }
    return typeof value === "string" && value.trim().length > 0;
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return "overview";
    }
  }

  global.MoyuSettingsModule = {
    parseSettingsHash,
    toSettingsHash,
    normalizeSettingsPayload,
    resolveSettingsRenderState,
    shouldUsePreviewSettingsFallback,
    getCapabilityDetailRows,
  };
})(typeof window === "undefined" ? globalThis : window);

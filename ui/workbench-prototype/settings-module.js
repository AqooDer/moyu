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
  };
})(typeof window === "undefined" ? globalThis : window);

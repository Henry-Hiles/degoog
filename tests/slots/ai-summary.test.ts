import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  setSettings,
  removeSettings,
} from "../../src/server/utils/plugin-settings";
import {
  AI_SUMMARY_ID,
  getAISummarySettings,
} from "../../src/server/extensions/commands/builtins/ai-summary/index";
import {
  getSlotPluginById,
  initSlotPlugins,
} from "../../src/server/extensions/slots/registry";

describe("ai-summary questionMarkOnly setting", () => {
  const origFetch = globalThis.fetch;

  beforeAll(async () => {
    globalThis.fetch = async () => new Response("", { status: 404 });

    const orig = process.env.DEGOOG_PLUGINS_DIR;
    process.env.DEGOOG_PLUGINS_DIR = "/nonexistent-ai-test-dir";
    await initSlotPlugins();
    if (orig !== undefined) process.env.DEGOOG_PLUGINS_DIR = orig;
    else delete process.env.DEGOOG_PLUGINS_DIR;
  });

  afterAll(async () => {
    globalThis.fetch = origFetch;
    await removeSettings(AI_SUMMARY_ID);
  });

  test("getAISummarySettings returns questionMarkOnly from settings", async () => {
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
      questionMarkOnly: true,
    });
    const settings = await getAISummarySettings();
    expect(settings.questionMarkOnly).toBe(true);
  });

  test("getAISummarySettings defaults questionMarkOnly to false", async () => {
    await removeSettings(AI_SUMMARY_ID);
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
    });
    const settings = await getAISummarySettings();
    expect(settings.questionMarkOnly).toBe(false);
  });

  test("trigger returns true for any query when questionMarkOnly is false", async () => {
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
      questionMarkOnly: false,
    });
    const slot = getSlotPluginById("builtin-ai-summary-slot");
    expect(slot).not.toBeNull();
    expect(await slot!.trigger("best restaurants")).toBe(true);
    expect(await slot!.trigger("best restaurants?")).toBe(true);
  });

  test("trigger returns false for non-question when questionMarkOnly is true", async () => {
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
      questionMarkOnly: true,
    });
    const slot = getSlotPluginById("builtin-ai-summary-slot");
    expect(slot).not.toBeNull();
    expect(await slot!.trigger("best restaurants")).toBe(false);
    expect(await slot!.trigger("  best restaurants  ")).toBe(false);
  });

  test("trigger returns true for question query when questionMarkOnly is true", async () => {
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "https://api.example.com/v1",
      model: "test-model",
      questionMarkOnly: true,
    });
    const slot = getSlotPluginById("builtin-ai-summary-slot");
    expect(slot).not.toBeNull();
    expect(await slot!.trigger("what are the best restaurants?")).toBe(true);
    expect(await slot!.trigger("why?")).toBe(true);
  });

  test("trigger returns false when baseUrl or model is not configured", async () => {
    await setSettings(AI_SUMMARY_ID, {
      baseUrl: "",
      model: "",
      questionMarkOnly: false,
    });
    const slot = getSlotPluginById("builtin-ai-summary-slot");
    expect(slot).not.toBeNull();
    expect(await slot!.trigger("test?")).toBe(false);
  });
});

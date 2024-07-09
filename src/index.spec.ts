import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import WechatyApp from "@feature/bot";
import { sleep } from "@utils/functions";

describe("puppet service", () => {
  it("should restart multiple times without problems", async () => {
    const wechatyApp = new WechatyApp({
      name: "test-puppet",
      puppet: "wechaty-puppet-wechat",
      puppetOptions: {
        uos: true,
      },
    });
    const puppet = wechatyApp.service;

    try {
      for (let i = 0; i < 3; i++) {
        await puppet.start();
        await sleep(1000 * 45);
        await puppet.stop();
        if (wechatyApp.lastError) {
          throw wechatyApp.lastError;
        }
        assert.ok(true, `start/stop-ed at #${i}`);
      };
      assert.ok(true, "Puppet service start/stop succeeded");
    } catch (error) {
      assert.fail(error as Error);
    }
  });
});
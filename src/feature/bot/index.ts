import logger from "@logger";
import { ScanStatus, Wechaty, WechatyBuilder, WechatyOptions } from "wechaty";
import type { WechatyEventListeners } from "wechaty/dist/esm/src/schemas/wechaty-events";
import QRCode from "qrcode";

class WechatyApp {
  service: Wechaty;
  /**
   * For testing: `lastError` can be accessed and thrown in test cases.
   * Added by onError event handler
   */
  lastError: Error | null = null;

  constructor(options: WechatyOptions) {
    this.service = WechatyBuilder.build(options);
    this.register();
  }

  private register() {
    this.service
      .on("start", this.onStart)
      .on("stop", this.onStop)
      .on("scan", this.onScan)
      .on("login", this.onLogin)
      .on("logout", this.onLogout)
      .on("message", this.onMessage)
      .on("error", this.onError);
  }

  private onStart: WechatyEventListeners["start"] = () => {
    logger.info("on(start) Wechaty started");
  };

  private onStop: WechatyEventListeners["stop"] = () => {
    logger.info("on(stop) Wechaty stopped");
  };

  private onScan: WechatyEventListeners["scan"] = async (qrcode, status, data?) => {
    if (status === ScanStatus.Timeout || status === ScanStatus.Waiting) {
      const qrcodeUrl = [
        "https://wechaty.js.org/qrcode/",
        encodeURIComponent(qrcode)
      ].join("");
      logger.info(`on(scan) ${ScanStatus[status]}, ${status}, ${qrcodeUrl}`);

      const consoleQRCode = await QRCode.toString(qrcode, { type: "terminal", small: true });
      logger.info(`Scan QRCode to login:\n${consoleQRCode}`);
    } else {
      logger.info(`on(scan) ${ScanStatus[status]}, ${status}`);
    }
  };

  private onLogin: WechatyEventListeners["login"] = (user) => {
    logger.info(`on(login) user:${user.toString()}`);
  };

  private onLogout: WechatyEventListeners["logout"] = async (user, reason?) => {
    logger.info(`on(logout) user:${user.toString()}, reason:${reason}`);
  };

  private onMessage: WechatyEventListeners["message"] = (message) => {
    logger.info(`on(message) ${message.toString()}`);
  };

  private onError: WechatyEventListeners["error"] = (error) => {
    logger.error(`on(error) ${error.details}`);
    this.lastError = error;
  };
}

export default WechatyApp;

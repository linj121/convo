import logger from "@logger";
import { ScanStatus, Wechaty, WechatyBuilder, WechatyOptions } from "wechaty";
import type { WechatyEventListeners } from "wechaty/dist/esm/src/schemas/wechaty-events";
import QRCode from "qrcode";
import PluginRegistry from "./plugins/pluginRegistry";
import registerPlugins from "./plugins/pluginRegistration";
import Scheduler from "./schedulers";

class WechatyService {
  /**
   * The wechaty puppet service we would like to use for everything 
   */
  public service: Wechaty;
  /**
   * For testing: `lastError` can be accessed and thrown in test cases.
   * Added by onError handler
   */
  public lastError: Error | null = null;
  /**
   * The timestamp in ms since midnight Jan 1, 1979 (UTC) 
   * when wechaty service is constructed and being initialized
   */
  public initializedAt: number;

  /**
   * Each Wechaty Service has its own cron-based task scheduler
   */
  private scheduler: Scheduler;


  constructor(options: WechatyOptions) {
    this.initializedAt = Date.now();
    this.service = WechatyBuilder.build(options);
    registerPlugins();
    this.scheduler = new Scheduler(this.service);
    this.setupListeners(this.service);
  }

  public async start(): Promise<void> {
    logger.info("Starting wechaty service ...");
    await this.service.start();
  }

  public async stop(): Promise<void> {
    logger.info("Stopping wechaty service ...");
    await this.service.stop();
  }

  private setupListeners(wechaty: Wechaty) {
    wechaty
      .on("start", this.onStart)
      .on("stop", this.onStop)
      .on("scan", this.onScan)
      .on("login", this.onLogin)
      .on("logout", this.onLogout)
      .on("message", this.onMessage)
      .on("ready", this.onReady)
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
      logger.info(`Scan QRCode to log in:\n${consoleQRCode}`);
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

  private onMessage: WechatyEventListeners["message"] = async (message) => {
    try {
      // Filter out all messages before WechatyService is initialized
      if (message.date().getTime() < this.initializedAt) return;

      logger.info(`on(message) ${message.toString()}`);

      // Each Wechaty Service should dispatch plugins from the same registry
      await PluginRegistry.getInstance().dispatchPlugins(message);
    } catch (error) {
      logger.error(error);      
    }
  };

  private onReady: WechatyEventListeners["ready"] = async () => {
    // Wechaty will get into ready state after user login
    logger.info(`on(ready) Wechaty ready`);
    // Start scheduled jobs ONLY AFTER when wechaty is ready
    // NOTE: This might not start immediately
    logger.info("Starting all scheduled jobs ...");
    this.scheduler.startAllJobs();
  };

  private onError: WechatyEventListeners["error"] = (error) => {
    logger.error(`on(error) ${error.details}`);
    this.lastError = error;
  };
}

export default WechatyService;

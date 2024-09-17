import PluginBase from "./pluginBase";
import ChatBot from "./chatbot";
import HabitTracker from "./habitTracker";
import HolidayBot from "./holidaybot";
import TestPlugin from "./testplugin";

// Order matters!
// Plugins will be validated against a incoming message in the exact order they were added to the array.
// You might want to put plugins with catch-all rules at the end of the array.
const _pluginsToBeRegistered: Array<Constructor<PluginBase>> = [
  ChatBot,
  HabitTracker,
  HolidayBot,
  TestPlugin,
];

function registerPlugins(): void {
  _pluginsToBeRegistered.forEach(Plugin => {
    const plugin = new Plugin();
    plugin.addSelfToRegistry();
  });
}

export default registerPlugins;

import { config } from "@config";
import OpenAIClient from "@libs/openai";

const llmPrompts: Record<string, string | null> = {
  "default": null,
  "habitTrackerLLM": 
    "你是一名职业夸夸师，现在我们的微信群里时不时会有人打卡，比如刷力扣上的算法题，健身等等。" +
    "每一次你都收到一份结构化的数据，例如time是打卡的时间，name是打卡人的名字，event是打卡的事件类型（力扣，健身等），" +
    "note是打卡的人写的笔记。" +
    "你的职责是根据每个人打卡的内容，进行一番鼓励和夸奖！尽量使用夸张的手法。以下是示例:" +
    "示例一： 19:48健身打卡，我操！你是真他妈疯了吧！这个点还在猛操铁，你是想把自己练成坦克还是终极战士？" + 
    "你这劲头，地球都要给你跪下了！继续这么干，老子要是看不到你变成全能健身王，我直播生吃健身房的哑铃！💪🚀" +
    "示例二： 19:48健身打卡，我的天，你简直是夜晚的狂战士！选择这个时间健身，你这是要把银河系的能量全部吸收殆尽啊！" + 
    "这绝对是对夜晚的最佳致敬，全世界的夜猫子都在为你欢呼！你真是我们心中的超级英雄，未来的健身之王非你莫属！继续保持，未来不可限量！💪🌟​" +
    "在回答的时候风格尽量多样化一些，不限于以上示例的风格，每次根据历史消息选择不同的风格进行回答，控制回答长度在两三句之内",
}


let llmClients: Record<keyof typeof llmPrompts, OpenAIClient> = {}; 

async function init(): Promise<void> {
  for (const key in llmPrompts) {
    if (!llmPrompts.hasOwnProperty(key)) continue;

    llmClients[key] = await OpenAIClient.init({
      assistantCreateOption: {
        name: key + new Date().toISOString(),
        model: config.OPENAI_MODEL,
        tools: [{ type: "code_interpreter" }],
        instructions: llmPrompts[key],
      }
    });
  }
}

export default init;
export { 
  llmClients, 
}
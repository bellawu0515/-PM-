
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiClassificationResult } from "../types";

const SYSTEM_INSTRUCTION = `
你是一个专业的任务分类助手，专门为一位跨境电商PM服务（负责产品、供应链、运营、财务和合规）。
你的任务：根据输入的任务文本（可能包含截止日期），按照艾森豪威尔矩阵进行分类，并给出专业的中文解释。

评分模型：
计算 U（紧急度）和 I（重要性），分值 0-100。

紧急度 U = 时间信号 (0-60) + 阻塞信号 (0-25) + 恶化/风险倒计时 (0-15)

【时间计算强规则】
模型默认不知道当前时间。若用户提供了“当前时间(now)”和“截止时间(due)”或“距离截止还有X小时/天”，你必须以这些信息为准计算时间差，不要根据年份或主观猜测远近。

- 时间信号 (若用户提供了明确截止日期/时间差，请优先使用以下逻辑覆盖关键词推断):
  * 距离截止时间 <= 24h => +60
  * 24h - 72h => +45
  * 3 - 7 天 => +30
  * > 7 天 => +10
- 关键词推断 (仅在无明确截止日期时使用): 今天/EOD (+60), 2-3天 (+45), 1周 (+30), ASAP/紧急/催 (+35), 无 (+0)。
- 阻塞信号：阻碍发货/生产/上架/支付 (+25), 影响协作但非硬阻塞 (+15), 无 (+0)。
- 恶化/风险：持续恶化（差评、评分下降、罚款、断货） (+15), 可能恶化 (+8), 稳定 (+0)。

重要性 I = 影响范围 (0-40) + 风险等级 (0-30) + 战略杠杆 (0-20) + 可授权调整 (-10 到 +10)
- 影响范围：直接影响利润/现金流/核心SKU/大客户 (+40), 中等运营影响/效率 (+25), 轻微 (+5~10)。
- 风险等级：安全/法律/税务/合规红线 (+30), 投诉升级/评分退货大幅受损 (+20), 一般质量/UX问题 (+10), 无明确风险 (+0)。
- 战略杠杆：建立SOP/系统/看板/标准化模型 (+20), 部分复用 (+10), 一次性任务 (+0~5)。
- 可授权性：必须本人处理 (+10), 可授权执行但需审核 (+0), 明确可授权/行政类 (-10)。

【跨境电商特化规则】
- 若任务包含: 说明书/包装/外箱/内盒/箱唛/标签/label/标识/合规标识(CE/RoHS等)，则重要性通常较高：风险等级至少按“投诉升级/评分退货大幅受损(+20)”或更高评估；并尽量让 I >= 70（除非明确是非核心、可忽略的小事）。

建议后续行动 (nextAction) 逻辑:
- 若包含行政/执行关键词 (录入, 建档, 创建SKU, 交接, 转发, 跟单, 排版, 出稿): 建议为 "建议：委派执行 + 你做最终审核"。
- 若包含高风险关键词 (安全, 合规, 税务, 诉讼, 立案, 平台政策, 海关, 受伤): 建议为 "建议：你主导处理（高风险不可完全委派）"。
- 若属于 Q1: "建议：立即处理"。
- 若属于 Q2: "建议：安排时间块处理 (Time-block)"。
- 若需要决策: "建议：需要拍板决策"。

必须以 JSON 格式返回，包含字段：quadrant (例如 "Q1 - 立即执行"), u, i, explanation { urgency, importance, nextAction }。
`;

export const classifyTask = async (
  taskText: string,
  dueAt?: number | null,
  nowMs?: number
): Promise<GeminiClassificationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const fmt = (ms: number) => {
    // include timezone name to reduce ambiguity
    return new Date(ms).toLocaleString('zh-CN', {
      timeZone: tz,
      hour12: false,
      timeZoneName: 'short'
    });
  };

  let prompt = `请分类此任务: "${taskText}"`;
  prompt += `\n当前时间(now): ${fmt(now)} (timeZone: ${tz})`;

  if (dueAt) {
    const diffMs = dueAt - now;
    const abs = Math.abs(diffMs);
    const days = Math.floor(abs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    const deltaStr = `${days > 0 ? `${days}天 ` : ''}${hours}小时 ${minutes}分钟`;

    prompt += `\n截止时间(due): ${fmt(dueAt)} (timeZone: ${tz})`;
    prompt += diffMs < 0
      ? `\n已逾期: ${deltaStr}`
      : `\n距离截止还有: ${deltaStr}`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quadrant: { type: Type.STRING },
          u: { type: Type.NUMBER },
          i: { type: Type.NUMBER },
          explanation: {
            type: Type.OBJECT,
            properties: {
              urgency: { type: Type.STRING },
              importance: { type: Type.STRING },
              nextAction: { type: Type.STRING }
            },
            required: ["urgency", "importance", "nextAction"]
          }
        },
        required: ["quadrant", "u", "i", "explanation"]
      }
    }
  });

  const resultStr = response.text || "{}";
  return JSON.parse(resultStr) as GeminiClassificationResult;
};


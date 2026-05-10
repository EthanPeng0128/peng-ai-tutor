import { trackAIUsage } from './ai-tracker'
import Anthropic from "@anthropic-ai/sdk"
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
export async function chatWithTutor(params: { messages: Array<{role:"user"|"assistant";content:string}>; mode: string; childName: string; childGrade: string }) {
  const sys: Record<string,string> = {
    child: "你是彭家AI家教，幫助"+params.childGrade+"的"+params.childName+"學習。輕鬆有趣，多用生活例子，給予鼓勵。繁體中文。",
    parent: "你是彭家AI家教顧問，回答家長關於"+params.childName+"("+params.childGrade+")的問題。專業清楚。繁體中文。",
    teacher: "你是彭家AI家教老師，幫助"+params.childGrade+"的"+params.childName+"深度學習。深入解釋多角度。繁體中文。",
  }
  const r = await anthropic.messages.create({ model:"claude-opus-4-5-20251101", max_tokens:2048, system:sys[params.mode]??sys.child, messages:params.messages })
  await trackAIUsage({ apiName: "chat", inputTokens: r.usage?.input_tokens || 0, outputTokens: r.usage?.output_tokens || 0 })
  return r.content[0].type==="text"?r.content[0].text:""
}
export async function generateQuiz(p: { content:string; mode:string; difficulty:string; count:number; grade:string; title:string; textbooks?: Array<{id?:string;subject:string;lesson_number:string;title:string;wrongCount?:number}>; weakFocus?:boolean; weakTopics?:Array<{question:string;correct_answer:string}> }) {
  const dm: Record<string,string> = {basic:"基礎",medium:"中等",advanced:"進階",exam:"會考"}
  
  // 章節列表：給 AI 知道有哪些章節可以標
  const lessonList = p.textbooks && p.textbooks.length > 0
    ? "\n\n本次出題涵蓋章節（每題必須在 lesson 欄位標明來自哪一課，格式必須完全是 \"科目 第N課：標題\"）：\n" + 
      p.textbooks.map(t => {
        const w = t.wrongCount || 0
        const tag = p.weakFocus && w >= 3 ? ` 🔴弱點(過去答錯${w}題)` : (p.weakFocus && w >= 1 ? ` 🟡需加強(${w}題)` : '')
        return `- ${t.subject} ${t.lesson_number}：${t.title}${tag}`
      }).join("\n")
    : ""
  
  const weakHint = p.weakFocus && p.textbooks && p.textbooks.some(t => (t.wrongCount || 0) > 0)
    ? "\n\n【弱點優先指示】請特別針對標記 🔴弱點 的章節多出題（建議該章節題數加倍），標記 🟢的章節少出（已掌握）。出題重點放在孩子薄弱的知識點。"
    : ""
  
  const weakTopicsHint = p.weakTopics && p.weakTopics.length > 0
    ? "\n\n【孩子歷史錯題參考】（避免重複出一模一樣的題目，但可換角度測同樣的知識點）：\n" +
      p.weakTopics.map((t,i) => `${i+1}. 題目：${t.question} → 正解：${t.correct_answer}`).join("\n")
    : ""
  
  const lessonHint = p.textbooks && p.textbooks.length > 0 ? "並標註 lesson:\"科目 第N課：標題\"，" : ""
  
  const mp: Record<string,string> = {
    summary: "從課文萃取"+p.count+"個必考知識點，JSON:{items:[{point,detail,importance:high|medium}]}",
    fill: "從課文出"+p.count+"題填空("+dm[p.difficulty]+")，"+lessonHint+"JSON:{questions:[{text:題目用___,blanks:[答案],hint,lesson:\"科目 第N課：標題\"}]}",
    exam: "從課文出"+p.count+"題選擇題("+dm[p.difficulty]+")，每題4個選項，仿真段考難度。重要：options陣列只放選項內容（純文字），不要在每個選項開頭加A./B./C./D.等字母前綴。"+lessonHint+"JSON:{questions:[{type:\"choice\",text,options:[\"純文字選項1\",\"純文字選項2\",\"純文字選項3\",\"純文字選項4\"],answer:\"A|B|C|D\",explanation,lesson:\"科目 第N課：標題\"}]}",
    knowledge: "將課文拆解為"+p.count+"個學習單元，JSON:{units:[{title,explanation,example,question,answer}]}",
  }
  const r = await anthropic.messages.create({ model:"claude-opus-4-5-20251101", max_tokens:4096,
    messages:[{role:"user",content:"台灣國中家教幫"+p.grade+"複習「"+p.title+"」"+lessonList+weakHint+weakTopicsHint+"\n\n課文:\n"+p.content.slice(0,6000)+"\n\n"+mp[p.mode]+"\n只回傳JSON。"}]
  })
  await trackAIUsage({ apiName: "quiz", inputTokens: r.usage?.input_tokens || 0, outputTokens: r.usage?.output_tokens || 0 })
  const t = r.content[0].type==="text"?r.content[0].text:""
  try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}
}
export async function analyzeExam(b64:string, mime:string) {
  const r = await anthropic.messages.create({ model:"claude-opus-4-5-20251101", max_tokens:4096,
    messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime as any,data:b64}},{type:"text",text:"分析考卷弱點。JSON:{score,weakPoints:[{topic,level:red|yellow|green,detail}],suggestions:[]}只回傳JSON。"}]}]
  })
  await trackAIUsage({ apiName: "exam-analysis", inputTokens: r.usage?.input_tokens || 0, outputTokens: r.usage?.output_tokens || 0 })
  const t=r.content[0].type==="text"?r.content[0].text:""
  try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}
}
export async function parseTextbookImage(b64:string,mime:string){
  const r=await anthropic.messages.create({model:"claude-opus-4-5-20251101",max_tokens:8192,
    messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime as any,data:b64}},{type:"text",text:"完整辨識課本圖片文字，保留段落，Markdown格式輸出。只輸出文字。"}]}]
  })
  await trackAIUsage({ apiName: "parse-textbook", inputTokens: r.usage?.input_tokens || 0, outputTokens: r.usage?.output_tokens || 0 })
  return r.content[0].type==="text"?r.content[0].text:""
}
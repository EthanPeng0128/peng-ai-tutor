import Anthropic from "@anthropic-ai/sdk"
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
export async function chatWithTutor(params: { messages: Array<{role:"user"|"assistant";content:string}>; mode: string; childName: string; childGrade: string }) {
  const sys: Record<string,string> = {
    child: "你是彭家AI家教，幫助"+params.childGrade+"的"+params.childName+"學習。輕鬆有趣，多用生活例子，給予鼓勵。繁體中文。",
    parent: "你是彭家AI家教顧問，回答家長關於"+params.childName+"("+params.childGrade+")的問題。專業清楚。繁體中文。",
    teacher: "你是彭家AI家教老師，幫助"+params.childGrade+"的"+params.childName+"深度學習。深入解釋多角度。繁體中文。",
  }
  const r = await anthropic.messages.create({ model:"claude-sonnet-4-20250514", max_tokens:2048, system:sys[params.mode]??sys.child, messages:params.messages })
  return r.content[0].type==="text"?r.content[0].text:""
}
export async function generateQuiz(p: { content:string; mode:string; difficulty:string; count:number; grade:string; title:string }) {
  const dm: Record<string,string> = {basic:"基礎",medium:"中等",advanced:"進階",exam:"會考"}
  const mp: Record<string,string> = {
    summary: "從課文萃取"+p.count+"個必考知識點，JSON:{items:[{point,detail,importance:high|medium}]}",
    fill: "從課文出"+p.count+"題填空("+dm[p.difficulty]+")，JSON:{questions:[{text:題目用___,blanks:[答案],hint}]}",
    exam: "從課文出"+p.count+"題考卷("+dm[p.difficulty]+")選擇填充混合，JSON:{questions:[{type:choice|fill,text,options:[A,B,C,D],answer,explanation}]}",
    knowledge: "將課文拆解為"+p.count+"個學習單元，JSON:{units:[{title,explanation,example,question,answer}]}",
  }
  const r = await anthropic.messages.create({ model:"claude-sonnet-4-20250514", max_tokens:4096,
    messages:[{role:"user",content:"台灣國中家教幫"+p.grade+"複習「"+p.title+"」\n\n課文:\n"+p.content.slice(0,6000)+"\n\n"+mp[p.mode]+"\n只回傳JSON。"}]
  })
  const t = r.content[0].type==="text"?r.content[0].text:""
  try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}
}
export async function analyzeExam(b64:string, mime:string) {
  const r = await anthropic.messages.create({ model:"claude-sonnet-4-20250514", max_tokens:4096,
    messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime as any,data:b64}},{type:"text",text:"分析考卷弱點。JSON:{score,weakPoints:[{topic,level:red|yellow|green,detail}],suggestions:[]}只回傳JSON。"}]}]
  })
  const t=r.content[0].type==="text"?r.content[0].text:""
  try{return JSON.parse(t)}catch{const m=t.match(/\{[\s\S]*\}/);return m?JSON.parse(m[0]):null}
}
export async function parseTextbookImage(b64:string,mime:string){
  const r=await anthropic.messages.create({model:"claude-sonnet-4-20250514",max_tokens:8192,
    messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:mime as any,data:b64}},{type:"text",text:"完整辨識課本圖片文字，保留段落，Markdown格式輸出。只輸出文字。"}]}]
  })
  return r.content[0].type==="text"?r.content[0].text:""
}
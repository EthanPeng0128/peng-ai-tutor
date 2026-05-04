import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
const anthropic = new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY!})
export async function POST(req: NextRequest) {
  try {
    const {examName,examDate,subjects,weakSubjects,blockedTimes}=await req.json()
    const daysLeft=Math.ceil((new Date(examDate).getTime()-Date.now())/(1000*60*60*24))
    const r=await anthropic.messages.create({model:"claude-sonnet-4-20250514",max_tokens:4096,
      messages:[{role:"user",content:"幫學生制定讀書計劃。考試:"+examName+",日期:"+examDate+",距今"+daysLeft+"天,科目:"+subjects.join("、")+",弱點:"+weakSubjects.join("、")+"\n生成每日計劃JSON:{plans:[{date,tasks:[{subject,content,duration}],note}],tips:[]}只回傳JSON。"}]
    })
    const t=r.content[0].type==="text"?r.content[0].text:""
    try{return NextResponse.json(JSON.parse(t))}catch{const m=t.match(/\{[\s\S]*\}/);return NextResponse.json(m?JSON.parse(m[0]):{plans:[]})}
  } catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
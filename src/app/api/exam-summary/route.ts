import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { trackAIUsage } from '@/lib/ai-tracker'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  try {
    const { wrongQuestions, content, grade, childId } = await request.json()
    
    if (!wrongQuestions || wrongQuestions.length === 0) {
      return NextResponse.json({ summary: null, message: '全部答對！沒有需要分析的錯題' })
    }

    const wrongList = wrongQuestions.map((q: any) => 
      '第 ' + (q.index + 1) + ' 題：' + q.text + 
      '\n孩子答案：' + (q.userAnswer || '(空白)') + 
      '\n正確答案：' + q.correctAnswer + 
      '\n章節：' + (q.lesson || '未標註') +
      (q.explanation ? '\n題目解析：' + q.explanation : '')
    ).join('\n---\n')

    const prompt = '你是台灣國中家教，分析以下 ' + (grade || '國二') + ' 學生的錯題。\n\n## 課本內容（參考依據）\n' + 
      content.slice(0, 5000) + 
      '\n\n## 孩子答錯的題目\n' + wrongList + 
      '\n\n## 請輸出 JSON 格式分析（嚴格遵守此格式）：\n' +
      '{\n' +
      '  "weakConcepts": [\n' +
      '    {\n' +
      '      "questionIndex": 第幾題（從 1 開始）,\n' +
      '      "questionText": "題目簡要",\n' +
      '      "lesson": "出自哪一課",\n' +
      '      "concept": "這題考的核心觀念名稱",\n' +
      '      "textbookExplanation": "從課本內容找出此觀念的詳細說明（150-250字，包含定義、原則、例子等）",\n' +
      '      "whyWrong": "孩子為什麼答錯？盲點分析（80-120字，分析他選的答案為何錯誤）",\n' +
      '      "correctReasoning": "正確答案的推理過程（60-100字）"\n' +
      '    }\n' +
      '  ],\n' +
      '  "overallAdvice": "整體學習建議（150-200字，告訴孩子今天該複習什麼、明天怎麼測驗、有哪些觀念要加強）"\n' +
      '}\n\n只回傳 JSON，不要任何其他文字。文字使用繁體中文。'

    const r = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    await trackAIUsage({ 
      apiName: 'exam-summary', 
      inputTokens: r.usage?.input_tokens || 0, 
      outputTokens: r.usage?.output_tokens || 0,
      childId,
    })

    const t = r.content[0].type === 'text' ? r.content[0].text : ''
    let result
    try {
      result = JSON.parse(t)
    } catch {
      const m = t.match(/\{[\s\S]*\}/)
      result = m ? JSON.parse(m[0]) : null
    }

    if (!result) {
      return NextResponse.json({ error: 'AI 解析失敗', preview: t.slice(0, 200) }, { status: 500 })
    }

    return NextResponse.json({ summary: result })
  } catch (e: any) {
    return NextResponse.json({ error: '伺服器錯誤', detail: e.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { content, type } = await req.json()

    const prompts = {
      highlight: `你是台灣國中老師。請將以下課文重新整理，用Markdown格式輸出：
- 用**粗體**標記必考知識點（黃色標注）
- 用*斜體*標記容易考錯的概念（紅色標注）
- 保留原文結構和所有重要內容
- 只輸出整理後的內容，不要說明

課文：
${content.slice(0, 6000)}`,

      mobile: `你是台灣國中老師。請將以下課文重新排版成手機友善格式：
- 每個段落簡短清楚（3-5行）
- 重要概念用**粗體**
- 列出重點用 • 符號
- 加入📌 標記特別重要的部分
- 字體排版舒適易讀
- 只輸出排版後的內容，不要說明

課文：
${content.slice(0, 6000)}`,
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompts[type as keyof typeof prompts] }],
    })

    const result = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

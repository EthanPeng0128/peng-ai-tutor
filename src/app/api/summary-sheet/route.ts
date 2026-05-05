import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const SUBJECT_COLORS: Record<string, { main: string; light: string; dark: string; mid: string }> = {
  '國語': { main: '#f0b429', light: '#fef9e7', dark: '#854F0B', mid: '#BA7517' },
  '英文': { main: '#4f7ef5', light: '#E6F1FB', dark: '#0C447C', mid: '#185FA5' },
  '數學': { main: '#34d399', light: '#E1F5EE', dark: '#0F6E56', mid: '#1D9E75' },
  '理化': { main: '#fb923c', light: '#FAECE7', dark: '#993C1D', mid: '#D85A30' },
  '社會': { main: '#a78bfa', light: '#EEEDFE', dark: '#3C3489', mid: '#534AB7' },
}

export async function POST(request: Request) {
  let stage = 'init'
  try {
    stage = 'parse-body'
    const { textbookId, regenerate } = await request.json()
    if (!textbookId) {
      return NextResponse.json({ error: '缺少 textbookId', stage }, { status: 400 })
    }

    stage = 'check-cache'
    if (!regenerate) {
      const { data: cacheRows } = await supabase
        .from('summary_sheets')
        .select('html_content')
        .eq('textbook_id', textbookId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cacheRows && cacheRows.length > 0) {
        return NextResponse.json({ html: cacheRows[0].html_content, cached: true })
      }
    }

    stage = 'fetch-textbook'
    const { data: textbook, error: tbError } = await supabase
      .from('textbooks')
      .select('*')
      .eq('id', textbookId)
      .maybeSingle()

    if (tbError) {
      return NextResponse.json({
        error: '查詢失敗',
        stage,
        debug: { textbookId, dbError: tbError.message, dbCode: tbError.code }
      }, { status: 500 })
    }

    if (!textbook) {
      return NextResponse.json({
        error: '找不到課文',
        stage,
        debug: { textbookId, hint: '資料庫沒有這個 ID' }
      }, { status: 404 })
    }

    if (!textbook.content || textbook.content.length < 50) {
      return NextResponse.json({
        error: '課文內容不足',
        stage,
        debug: { textbookId, contentLength: textbook.content?.length || 0 }
      }, { status: 400 })
    }

    stage = 'generate-ai'
    const colors = SUBJECT_COLORS[textbook.subject_name] || SUBJECT_COLORS['社會']

    const prompt = `你是專業的教學設計師，幫一位${textbook.grade}的學生製作「一頁重點整理圖」。

課文資訊：
- 科目：${textbook.subject_name}
- 課次：${textbook.lesson_number}
- 標題：${textbook.title}
- 內容：
${textbook.content}

請產出一段完整的 HTML 程式碼作為這課的重點整理圖。要求：
1. 整體是一張 16:9 橫版，aspect-ratio: 16/9
2. 使用以下科目顏色：主色 ${colors.main}、淺色 ${colors.light}、深色 ${colors.dark}、中間色 ${colors.mid}
3. 標題列要有：科目+課次資訊、課文標題、「一頁重點」標籤
4. 主內容區用 grid 排出 6 個重點卡片（3欄 x 2列）
5. 內容涵蓋核心知識點、必背定義、易混淆對比、會考必背
6. 卡片內排版要有層次：標題粗體深色、內文小字、關鍵詞用主色強調
7. 字體 sans-serif，整體乾淨專業
8. 底部要有「彭家 AI 家教平台」浮水印

重要：只輸出 HTML，不要說明文字、不要 markdown 程式碼框，從 <div 開始，所有樣式用 inline style，中文不要錯字。

直接輸出 HTML：`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    let html = ''
    for (const block of message.content) {
      if (block.type === 'text') html += block.text
    }
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    if (!html.startsWith('<')) {
      return NextResponse.json({
        error: 'AI 生成失敗',
        stage,
        debug: { preview: html.slice(0, 200) }
      }, { status: 500 })
    }

    stage = 'save-result'
    await supabase.from('summary_sheets').insert({
      textbook_id: textbookId,
      child_id: textbook.child_id,
      html_content: html,
      subject_color: colors.main,
    })

    return NextResponse.json({ html, cached: false })
  } catch (e: any) {
    return NextResponse.json({
      error: '伺服器錯誤',
      stage,
      debug: { msg: e.message, name: e.name }
    }, { status: 500 })
  }
}

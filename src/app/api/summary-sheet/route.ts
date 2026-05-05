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
      return NextResponse.json({ error: '查詢失敗', stage, debug: { textbookId, dbError: tbError.message, dbCode: tbError.code } }, { status: 500 })
    }
    if (!textbook) {
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
      return NextResponse.json({ error: '查詢失敗', stage, debug: { textbookId, dbError: tbError.message, dbCode: tbError.code } }, { status: 500 })
    }
    if (!textbook) {
      return NextResponse.json({ error: '找不到課文', stage, debug: { textbookId } }, { status: 404 })
    }
    if (!textbook.content || textbook.content.length < 50) {
      return NextResponse.json({ error: '課文內容不足', stage, debug: { contentLength: textbook.content?.length || 0 } }, { status: 400 })
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

請輸出一段完整 HTML，遵守以下嚴格規則：

【容器規則】
1. 最外層用一個 <div class="summary-root"> 包住所有內容
2. 在最開頭加入 <style> 區塊，定義以下 CSS：
   - .summary-root { width: 100%; max-width: 1280px; aspect-ratio: 16/9; margin: 0 auto; background: ${colors.light}; border-radius: 12px; padding: 24px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
   - .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 12px; flex: 1; min-height: 0; }
   - .summary-card { background: white; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-left: 3px solid ${colors.main}; display: flex; flex-direction: column; overflow: hidden; }
   - .summary-card h3 { margin: 0 0 8px 0; font-size: 14px; color: ${colors.dark}; font-weight: 700; }
   - .summary-card p { margin: 0 0 6px 0; font-size: 12px; line-height: 1.6; color: #444; }
   - .summary-card .key { color: ${colors.mid}; font-weight: 700; }
   - 並加入手機響應式：@media (max-width: 768px) { .summary-root { aspect-ratio: auto; height: auto; } .summary-grid { grid-template-columns: 1fr; grid-template-rows: auto; } .summary-card { min-height: 120px; } }

【標題列】
3. 在 .summary-root 內第一個元素是標題列，包含：
   - 科目+課次標籤（小色塊）
   - 課文標題（h2 大字）
   - 「一頁重點」徽章

【6 個重點卡片】
4. 用 <div class="summary-grid"> 包住 6 個 <div class="summary-card">
5. 每張卡片有 <h3>標題</h3> + 內容（用 <p>，重要詞用 <span class="key">標出）
6. 內容根據實際課文挑選最重要的，**不要全塞**
7. 最後一張卡片標題是「⭐ 會考必背」或「💡 記憶口訣」

【底部浮水印】
8. 整個 .summary-root 結尾加：<div style="text-align: center; font-size: 10px; color: #999; margin-top: 8px;">彭家 AI 家教平台</div>

【嚴格輸出規則】
- 只輸出 HTML，不要任何說明文字、不要 markdown 程式碼框
- 從 <style> 開始，到 </div> 結束（最外層 .summary-root 的結束標籤）
- 中文不要錯字
- 內容根據實際課文，不能瞎編

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
      return NextResponse.json({ error: 'AI 生成失敗', stage, debug: { preview: html.slice(0, 200) } }, { status: 500 })
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
    return NextResponse.json({ error: '伺服器錯誤', stage, debug: { msg: e.message, name: e.name } }, { status: 500 })
  }
}

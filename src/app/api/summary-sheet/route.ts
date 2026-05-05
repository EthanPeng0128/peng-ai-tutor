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
  try {
    const { textbookId, regenerate } = await request.json()

    if (!textbookId) {
      return NextResponse.json({ error: '缺少 textbookId' }, { status: 400 })
    }

    // 如果不是強制重新生成，先看看是否已有快取
    if (!regenerate) {
      const { data: existing } = await supabase
        .from('summary_sheets')
        .select('*')
        .eq('textbook_id', textbookId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json({ html: existing.html_content, cached: true })
      }
    }

    // 取出課文內容
    const { data: textbook, error: tbError } = await supabase
      .from('textbooks')
      .select('*')
      .eq('id', textbookId)
      .single()

    if (tbError || !textbook) {
      return NextResponse.json({ error: '找不到課文' }, { status: 404 })
    }

    const colors = SUBJECT_COLORS[textbook.subject_name] || SUBJECT_COLORS['社會']

    const prompt = `你是專業的教學設計師，幫一位${textbook.grade}的學生製作「一頁重點整理圖」。

課文資訊：
- 科目：${textbook.subject_name}
- 課次：${textbook.lesson_number}
- 標題：${textbook.title}
- 內容：
${textbook.content}

請產出**一段完整的 HTML 程式碼**作為這課的重點整理圖。要求：

1. 整體是一張 16:9 橫版，aspect-ratio: 16/9
2. 使用以下科目顏色：
   - 主色：${colors.main}
   - 淺色背景：${colors.light}
   - 深色文字：${colors.dark}
   - 中間色：${colors.mid}
3. 標題列要有：科目+課次資訊、課文標題、「一頁重點」標籤
4. 主內容區用 grid 排出 6 個重點卡片（3欄 x 2列），涵蓋：
   - 核心知識點（2~3 個最重要的概念）
   - 必背定義或公式
   - 容易混淆的對比
   - 會考必背 / 記憶口訣
5. 卡片內排版要有層次：標題用粗體深色、內文小字、重要關鍵詞用主色強調
6. 字體 sans-serif，整體乾淨專業
7. 底部要有「彭家 AI 家教平台」浮水印

**重要規則：**
- 只輸出 HTML，不要任何說明文字、不要 markdown 程式碼框（不要 \`\`\`）
- 從 <div 開始，到對應的 </div> 結束
- 所有樣式用 inline style 寫（不要 <style> 標籤）
- 中文不要錯字
- 內容要根據實際課文，不能瞎編

直接輸出 HTML：`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    let html = ''
    for (const block of message.content) {
      if (block.type === 'text') html += block.text
    }

    // 清理可能的 markdown 程式碼框
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    if (!html.startsWith('<')) {
      return NextResponse.json({ error: 'AI 生成失敗', detail: html.slice(0, 200) }, { status: 500 })
    }

    // 存入資料庫
    const { error: insertError } = await supabase.from('summary_sheets').insert({
      textbook_id: textbookId,
      child_id: textbook.child_id,
      html_content: html,
      subject_color: colors.main,
    })

    if (insertError) {
      console.error('存檔失敗:', insertError)
    }

    return NextResponse.json({ html, cached: false })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || '生成失敗' }, { status: 500 })
  }
}

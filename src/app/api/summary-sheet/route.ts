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

    const prompt = `你是「考試重點整理大師」，要幫一位${textbook.grade}的學生製作【超完整一頁懶人包】。

課文資訊：
- 科目：${textbook.subject_name}
- 課次：${textbook.lesson_number}
- 標題：${textbook.title}
- 內容（請完整讀過所有重點）：
${textbook.content}

【核心目標】
做一張 16:9 整理圖，把這課所有「考試會考的點」「需要背的點」「容易混淆的點」「老師會強調的點」全部塞進去。學生看完這一張，就不用再看課本。

【強制規則 — 必遵守】
1. 整體尺寸：寬 1240px，高 697px（16:9），用 inline style 寫死
2. 排版：grid 4 欄 × 3 列 = 共 12 個小卡片區塊（如果課文短，可改為 3×3=9 格）
3. 字體：標題 13px、內文 10~11px，行高 1.4
4. 顏色：主色 ${colors.main}、淺底 ${colors.light}、深字 ${colors.dark}、強調色 ${colors.mid}
5. 整體背景白色或極淺色，卡片之間 gap 6px

【內容要求 — 越多越好】
6. 把課文裡所有專有名詞、定義、年代、人物、地點、特徵、原因、結果、比較項目、口訣……全部抓出來
7. 不要刪內容，要「濃縮表達」：用條列、表格、箭頭圖示
8. 每張卡片塞 4~8 個資訊點，不要怕擠
9. 用 → 表示因果、用 vs 表示對比、用 ① ② ③ 列項目、用 ★ 標記必背
10. 重要關鍵字一律用 <strong style="color:${colors.mid}">關鍵字</strong> 強調
11. 數字、年代、專有名詞要醒目

【卡片內容建議分類】
卡片要涵蓋以下面向（依課文有的內容調整）：
- 核心定義（2~3 張）
- 重要人物/事件/年代
- 特徵 / 種類 / 分類
- 原因與結果
- 比較與對比表格（vs）
- 易混淆觀念
- 計算公式或步驟
- 應用實例
- ⭐ 會考必背速記口訣（最後一張，用主色背景）

【輸出規則】
- 只輸出 HTML，不要任何說明文字、不要 markdown 框
- 從 <div 開始（最外層容器），到對應 </div> 結束
- 所有樣式用 inline style
- 中文不要錯字
- 內容根據實際課文，不能瞎編
- 用上 95% 以上的 max_tokens，盡量塞

直接輸出 HTML：`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 8000,
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

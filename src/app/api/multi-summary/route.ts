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
    const { textbookIds, regenerate, customTitle } = await request.json()
    if (!textbookIds || !Array.isArray(textbookIds) || textbookIds.length === 0) {
      return NextResponse.json({ error: '缺少 textbookIds', stage }, { status: 400 })
    }

    const cacheKey = [...textbookIds].sort().join(',')

    stage = 'check-cache'
    if (!regenerate) {
      const { data: cacheRows } = await supabase
        .from('summary_sheets')
        .select('html_content')
        .eq('textbook_id', cacheKey)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cacheRows && cacheRows.length > 0) {
        return NextResponse.json({ html: cacheRows[0].html_content, cached: true })
      }
    }

    stage = 'fetch-textbooks'
    const { data: textbooks, error: tbError } = await supabase
      .from('textbooks')
      .select('*')
      .in('id', textbookIds)

    if (tbError) {
      return NextResponse.json({ error: '查詢失敗', stage, debug: { dbError: tbError.message } }, { status: 500 })
    }
    if (!textbooks || textbooks.length === 0) {
      return NextResponse.json({ error: '找不到課文', stage }, { status: 404 })
    }

    stage = 'generate-ai'
    const subjectName = textbooks[0].subject_name
    const colors = SUBJECT_COLORS[subjectName] || SUBJECT_COLORS['社會']
    const grade = textbooks[0].grade
    const childId = textbooks[0].child_id

    const lessonList = textbooks.map(t => `${t.lesson_number} ${t.title}`).join('、')
    const combinedContent = textbooks.map(t => `【${t.lesson_number} ${t.title}】\n${t.content}`).join('\n\n---\n\n')

    const prompt = `你是「考試重點整理大師」，要幫一位${grade}的學生製作【跨課大範圍總整理圖】，準備段考用。

科目：${subjectName}
範圍：${lessonList}
總共 ${textbooks.length} 課

完整課文內容：
${combinedContent}

【核心目標】
做一張 A4 橫向總整理圖，把這幾課所有「考試會考的點」「需要背的點」「容易混淆的點」「跨課可比較的點」全部塞進去。

【強制規則 - 排版必遵守】
1. 整體尺寸：固定 寬 1240px、高 877px（A4 橫向滿版，不可超出）
2. 最外層 div 樣式必須：width:1240px;height:877px;padding:14px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;background:white;font-family:-apple-system,sans-serif
3. 排版用 CSS grid，gap 8px，3 欄 × 3 列 = 9 格（讓字夠大）。如果內容真的很多才用 4×3=12 格
4. 每張卡片內部用 padding:12px、box-sizing:border-box、border-radius:8px
5. 字體必須夠大易讀：
   - 卡片標題 16px (font-weight:700, margin-bottom:8px)
   - 內文 14px (line-height:1.5, font-weight:500)
   - 副標題 13px
   - 條列項目間距 4~6px
6. 顏色：主色 ${colors.main}、淺底 ${colors.light}、深字 ${colors.dark}、強調色 ${colors.mid}
7. 卡片必須 overflow:hidden，文字優先簡潔，避免長句
8. 絕對禁止：position:absolute 重疊文字、transform 推擠
9. 內容寧可少而精，不要塞太多 → 字大才好讀
10. 所有 li、div、p 都要 margin:0 ~ 4px，避免溢位

【標題列】
6. 第一張卡片是大標題列：${subjectName} 大範圍總整理 - ${lessonList}
7. 標題列要有「📚 ${textbooks.length} 課總複習」徽章和「考前必看」標籤

【內容組織原則】
8. 每張小卡片代表一個「主題」或「概念」，標題明確
9. 跨課內容要交叉融合：相同概念合併、不同觀點對比
10. 強調「跨課關聯」：如果不同課有相關概念，要做成對比卡片
11. 至少 1 張卡片是「重點對比表格」（橫跨多課）
12. 至少 1 張卡片是「會考必背速記口訣」（最後一張，用主色背景）

【內容要求 — 越多越好】
13. 把所有專有名詞、定義、年代、人物、地點、特徵、原因、結果、比較項目、口訣……全部抓出來
14. 重要關鍵字一律用 <strong style="color:${colors.mid}">關鍵字</strong> 強調
15. 用 → 表示因果、用 vs 表示對比、用 ① ② ③ 列項目、用 ★ 標記必背

【嚴格輸出規則】
- 只輸出 HTML，不要任何說明文字、不要 markdown 框
- 從 <div 開始，到對應 </div> 結束
- 所有樣式用 inline style
- 中文不要錯字
- 內容根據實際課文，不能瞎編

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
    const defaultTitle = `${subjectName} 大範圍整理（${textbooks.length}課）`
    await supabase.from('summary_sheets').insert({
      textbook_id: cacheKey,
      child_id: childId,
      html_content: html,
      subject_color: colors.main,
      title: defaultTitle,
      is_multi: true,
      textbook_count: textbooks.length,
      subject_name: subjectName,
    })

    return NextResponse.json({ html, cached: false, count: textbooks.length, title: defaultTitle })
  } catch (e: any) {
    return NextResponse.json({ error: '伺服器錯誤', stage, debug: { msg: e.message } }, { status: 500 })
  }
}

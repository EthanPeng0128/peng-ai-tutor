import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const { childId, htmlContent, title, isMulti, textbookCount, subjectName, subjectColor, textbookId } = await request.json()
    
    if (!htmlContent || !title || !childId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const { error } = await supabase.from('summary_sheets').insert({
      textbook_id: null,  // 大範圍整理沒有單一 textbook_id
      child_id: childId,
      html_content: htmlContent,
      subject_color: subjectColor || '#a78bfa',
      title: title,
      is_multi: isMulti ?? true,
      textbook_count: textbookCount || 1,
      subject_name: subjectName || '',
    })

    if (error) {
      return NextResponse.json({ error: 'DB 寫入失敗', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true })
  } catch (e: any) {
    return NextResponse.json({ error: '伺服器錯誤', detail: e.message }, { status: 500 })
  }
}

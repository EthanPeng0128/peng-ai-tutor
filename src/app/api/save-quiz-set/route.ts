import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const { childId, title, subjectName, textbookCount, mode, difficulty, questions } = await request.json()
    
    if (!childId || !title || !questions) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const { data, error } = await supabase.from('quiz_sets').insert({
      child_id: childId,
      title,
      subject_name: subjectName,
      textbook_count: textbookCount || 1,
      mode,
      difficulty,
      questions,
      total_count: Array.isArray(questions) ? questions.length : 0,
    }).select().single()

    if (error) {
      return NextResponse.json({ error: 'DB 寫入失敗', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: '伺服器錯誤', detail: e.message }, { status: 500 })
  }
}

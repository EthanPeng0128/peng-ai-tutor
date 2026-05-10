import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: Request) {
  try {
    const { quizSetId, childId, score, total, answers, durationSec } = await request.json()
    
    if (!quizSetId || !childId) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    const correctRate = total > 0 ? (score / total * 100) : 0

    const { error } = await supabase.from('quiz_attempts').insert({
      quiz_set_id: quizSetId,
      child_id: childId,
      score,
      total,
      correct_rate: correctRate,
      answers,
      duration_sec: durationSec,
    })

    if (error) {
      return NextResponse.json({ error: 'DB 寫入失敗', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: true })
  } catch (e: any) {
    return NextResponse.json({ error: '伺服器錯誤', detail: e.message }, { status: 500 })
  }
}

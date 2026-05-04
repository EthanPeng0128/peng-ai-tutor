import { NextRequest, NextResponse } from "next/server"
import { generateQuiz } from "@/lib/claude"
export async function POST(req: NextRequest) {
  try { const b=await req.json(); const r=await generateQuiz(b); return NextResponse.json(r) }
  catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
import { NextRequest, NextResponse } from "next/server"
import { analyzeExam } from "@/lib/claude"
export async function POST(req: NextRequest) {
  try { const {base64,mimeType}=await req.json(); const r=await analyzeExam(base64,mimeType); return NextResponse.json(r) }
  catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
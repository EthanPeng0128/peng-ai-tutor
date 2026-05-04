import { NextRequest, NextResponse } from "next/server"
import { chatWithTutor } from "@/lib/claude"
export async function POST(req: NextRequest) {
  try { const b=await req.json(); const reply=await chatWithTutor(b); return NextResponse.json({reply}) }
  catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
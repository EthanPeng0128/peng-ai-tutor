import { NextRequest, NextResponse } from "next/server"
import { parseTextbookImage } from "@/lib/claude"

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json()
    if (!base64) return NextResponse.json({ error: "No data" }, { status: 400 })
    const content = await parseTextbookImage(base64, mimeType || "image/jpeg")
    return NextResponse.json({ content })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

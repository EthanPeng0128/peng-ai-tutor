import { NextRequest, NextResponse } from "next/server"
import { parseTextbookImage } from "@/lib/claude"

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const file = fd.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const mime = file.type || "image/jpeg"

    // PDF: skip AI parsing, just return success
    if (mime === "application/pdf" || file.name?.endsWith(".pdf")) {
      return NextResponse.json({ content: "（PDF已上傳）" })
    }

    // Image: AI OCR parsing
    const ab = await file.arrayBuffer()
    const b64 = Buffer.from(ab).toString("base64")
    const content = await parseTextbookImage(b64, mime)
    return NextResponse.json({ content })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

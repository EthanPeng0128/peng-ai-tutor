import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Mode 1: PDF URL from Supabase Storage (large files)
    if (body.pdfUrl) {
      // Download PDF from Supabase
      const pdfRes = await fetch(body.pdfUrl)
      if (!pdfRes.ok) throw new Error("Failed to fetch PDF from storage")
      const pdfBuffer = await pdfRes.arrayBuffer()
      const base64 = Buffer.from(pdfBuffer).toString("base64")
      
      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            } as any,
            {
              type: "text",
              text: "請完整辨識這份PDF文件中的所有文字內容，包括標題、正文、表格、注釋等。保留原有的段落結構，用Markdown格式輸出。只輸出辨識的文字內容，不要加任何說明。"
            }
          ],
        }],
      })
      
      const content = response.content[0].type === "text" ? response.content[0].text : ""
      return NextResponse.json({ content })
    }
    
    // Mode 2: Image base64 (small files, direct upload)
    if (body.base64) {
      const { base64, mimeType } = body
      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType as any, data: base64 },
            },
            {
              type: "text",
              text: "請完整辨識這張課本圖片中的所有文字內容，包括標題、正文、表格、注釋等。保留原有的段落結構，用Markdown格式輸出。只輸出辨識的文字內容，不要加任何說明。"
            }
          ],
        }],
      })
      const content = response.content[0].type === "text" ? response.content[0].text : ""
      return NextResponse.json({ content })
    }

    return NextResponse.json({ error: "No data provided" }, { status: 400 })
  } catch (e: any) {
    console.error("Upload API error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

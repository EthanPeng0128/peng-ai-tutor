import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // PDF mode: download from Supabase using service key, then parse with Claude
    if (body.pdfUrl) {
      // Extract storage path from URL
      const url = body.pdfUrl as string
      const pathMatch = url.match(/textbook-files\/(.+)/)
      const storagePath = pathMatch ? pathMatch[1] : null

      let pdfBuffer: ArrayBuffer

      if (storagePath) {
        // Download using Supabase REST API with service key (bypasses RLS)
        const downloadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/textbook-files/${storagePath}`,
          { headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "apikey": SUPABASE_SERVICE_KEY } }
        )
        if (!downloadRes.ok) {
          throw new Error(`Storage download failed: ${downloadRes.status} ${await downloadRes.text()}`)
        }
        pdfBuffer = await downloadRes.arrayBuffer()
      } else {
        // Try direct URL fetch
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`)
        pdfBuffer = await res.arrayBuffer()
      }

      const base64 = Buffer.from(pdfBuffer).toString("base64")

      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } } as any,
            { type: "text", text: "請完整辨識這份PDF文件中的所有文字內容，包括標題、正文、表格、注釋等。保留原有的段落結構，用Markdown格式輸出。只輸出辨識的文字內容，不要加任何說明。" }
          ],
        }],
      })

      const content = response.content[0].type === "text" ? response.content[0].text : ""
      return NextResponse.json({ content })
    }

    // Image mode: base64 direct
    if (body.base64) {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 8192,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mimeType as any, data: body.base64 } },
            { type: "text", text: "請完整辨識這張課本圖片中的所有文字內容，保留段落結構，用Markdown格式輸出。只輸出文字內容。" }
          ],
        }],
      })
      const content = response.content[0].type === "text" ? response.content[0].text : ""
      return NextResponse.json({ content })
    }

    return NextResponse.json({ error: "No data" }, { status: 400 })
  } catch (e: any) {
    console.error("Upload error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

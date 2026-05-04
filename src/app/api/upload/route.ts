import { NextRequest, NextResponse } from "next/server"
import { parseTextbookImage } from "@/lib/claude"
export async function POST(req: NextRequest) {
  try {
    const fd=await req.formData(); const file=fd.get("file") as File|null
    if(!file) return NextResponse.json({error:"No file"},{status:400})
    const ab=await file.arrayBuffer(); const b64=Buffer.from(ab).toString("base64")
    const mime=file.type||"image/jpeg"
    if(mime==="application/pdf") return NextResponse.json({content:"（PDF已上傳，AI解析完成）"})
    const content=await parseTextbookImage(b64,mime)
    return NextResponse.json({content})
  } catch(e:any){ return NextResponse.json({error:e.message},{status:500}) }
}
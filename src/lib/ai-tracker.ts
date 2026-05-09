import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Claude Opus 4.5 定價（USD per 1M tokens）
// Input: $15 / Output: $75
const PRICE_INPUT_PER_1M = 15
const PRICE_OUTPUT_PER_1M = 75

export async function trackAIUsage(params: {
  apiName: string
  inputTokens: number
  outputTokens: number
  model?: string
  childId?: string
}) {
  const cost = (params.inputTokens / 1_000_000) * PRICE_INPUT_PER_1M
             + (params.outputTokens / 1_000_000) * PRICE_OUTPUT_PER_1M
  
  try {
    await supabase.from('ai_usage').insert({
      api_name: params.apiName,
      model: params.model || 'claude-opus-4-5-20251101',
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: cost,
      child_id: params.childId || null,
    })
  } catch (e) {
    console.error('記錄 AI 用量失敗:', e)
  }
}

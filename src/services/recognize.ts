// Handwriting recognition: rasterize the ink layer and ask a vision model to
// transcribe it, via the shared LLM proxy. Uses Anthropic's Messages API shape
// (provider 'anthropic', endpoint 'messages') with claude-opus-4-8.

import { llmProxy } from '@/lib/llm-proxy'
import { rasterizeStrokes } from '@/lib/rasterize'
import { UnauthorizedError } from '@/services/drive'
import type { Stroke } from '@/types'

const PROMPT =
  'This image is a page of handwritten notes. Transcribe the handwriting into ' +
  'plain text exactly as written, preserving line breaks and paragraph structure. ' +
  'Do not add commentary, headings, or explanations — output only the transcribed ' +
  'text. If the page is blank or unreadable, output nothing.'

interface AnthropicTextBlock {
  type: string
  text?: string
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[]
  stop_reason?: string
  error?: { message?: string }
}

/** Transcribe the given ink strokes into text. Returns '' for a blank page. */
export async function recognizeHandwriting(token: string, ink: Stroke[]): Promise<string> {
  if (ink.length === 0) return ''

  const imageData = rasterizeStrokes(ink)
  const res = await llmProxy(
    'anthropic',
    'messages',
    {
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageData } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    },
    token,
  )

  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || `Recognition failed (${res.status})`)
  }

  const data = (await res.json()) as AnthropicResponse
  if (data.stop_reason === 'refusal') {
    throw new Error('The model declined to transcribe this page.')
  }
  return (data.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('')
    .trim()
}

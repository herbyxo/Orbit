/**
 * llmProviders.js
 * Unified dispatcher for BYO-key LLM calls. Supports Anthropic, OpenAI, Google.
 *
 * Everything stays stateless: the API key is passed per-request and never
 * persisted or logged. The frontend stores the key in localStorage; the
 * server just forwards it to the selected provider's SDK.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const MAX_TOKENS = 1000

/**
 * Catalog of providers + models surfaced in the settings UI.
 * Add to the `models` array to expose a new model; no other code changes needed.
 */
export const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyConsoleUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (fast + smart)' },
      { id: 'claude-opus-4-5', label: 'Claude Opus 4.5 (most capable)' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest)' },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (legacy)' },
    ],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyConsoleUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini (cheap + fast)' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'o1-mini', label: 'o1-mini (reasoning)' },
    ],
  },
  google: {
    id: 'google',
    label: 'Google Gemini',
    keyPlaceholder: 'AIza...',
    keyConsoleUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast + cheap)' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
  },
}

/**
 * Main entrypoint. Takes a normalized request, returns { text, usage }.
 *
 * @param {object} args
 * @param {string} args.provider  - 'anthropic' | 'openai' | 'google'
 * @param {string} args.model     - model id valid for that provider
 * @param {string} args.apiKey    - user's own key, passed through, never stored
 * @param {string} args.system    - system prompt
 * @param {Array}  args.messages  - [{ role: 'user'|'assistant', content: string }]
 */
export async function callLLM({ provider, model, apiKey, system, messages }) {
  if (!provider || !model || !apiKey) {
    throw new Error('provider, model, and apiKey are required')
  }

  switch (provider) {
    case 'anthropic':
      return callAnthropic({ apiKey, model, system, messages })
    case 'openai':
      return callOpenAI({ apiKey, model, system, messages })
    case 'google':
      return callGoogle({ apiKey, model, system, messages })
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

async function callAnthropic({ apiKey, model, system, messages }) {
  const client = new Anthropic({ apiKey })
  const res = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return {
    text,
    usage: {
      inputTokens: res.usage?.input_tokens,
      outputTokens: res.usage?.output_tokens,
    },
  }
}

async function callOpenAI({ apiKey, model, system, messages }) {
  const client = new OpenAI({ apiKey })
  const res = await client.chat.completions.create({
    model,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: system },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  })
  return {
    text: res.choices[0]?.message?.content ?? '',
    usage: {
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
    },
  }
}

async function callGoogle({ apiKey, model, system, messages }) {
  const client = new GoogleGenerativeAI(apiKey)
  // Gemini splits the last user message from prior history.
  const last = messages[messages.length - 1]
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const chat = client
    .getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { maxOutputTokens: MAX_TOKENS },
    })
    .startChat({ history })
  const res = await chat.sendMessage(last.content)
  return {
    text: res.response.text(),
    usage: {
      inputTokens: res.response.usageMetadata?.promptTokenCount,
      outputTokens: res.response.usageMetadata?.candidatesTokenCount,
    },
  }
}

/**
 * Normalize provider errors into user-friendly messages.
 * Keeps the raw error off the wire (could contain key fragments in rare cases).
 */
export function humanizeLLMError(err) {
  const msg = String(err?.message ?? err)
  if (/401|invalid.*api.?key|incorrect api key/i.test(msg)) {
    return 'Invalid API key for the selected provider.'
  }
  if (/429|rate limit|quota/i.test(msg)) {
    return 'Rate limit hit. Wait a moment and try again.'
  }
  if (/insufficient.*credit|billing|payment/i.test(msg)) {
    return 'Account has no credit or billing is not set up.'
  }
  if (/not.*found|does not exist/i.test(msg)) {
    return 'Model not found. Try a different one from the dropdown.'
  }
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return 'Request timed out. Try again.'
  }
  return msg.slice(0, 200)
}

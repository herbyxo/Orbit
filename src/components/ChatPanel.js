'use client'

import { useState, useRef, useEffect } from 'react'
import { PROVIDERS } from '@/lib/llmProviders'
import LLMSettings from './LLMSettings'

const STORAGE_KEY = 'orbit-llm-config'

/**
 * ChatPanel - AI chat with BYO-key support.
 *
 * Flow:
 *   1. Read stored config from localStorage on mount.
 *   2. If no config, show inline LLMSettings form instead of chat.
 *   3. Once configured, show chat normally. Gear icon opens LLMSettings in edit mode.
 *   4. Every chat request carries { provider, model, apiKey } from state - server never stores.
 */
export default function ChatPanel({ graphContext, onHighlight }) {
  const [config, setConfig] = useState(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [editingConfig, setEditingConfig] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  // Load saved config on mount (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.provider && parsed?.model && parsed?.apiKey) {
          setConfig(parsed)
        }
      }
    } catch {
      // ignore - treat as no config
    }
    setConfigLoaded(true)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function saveConfig(next) {
    setConfig(next)
    setEditingConfig(false)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage full / disabled - still works in-memory for this session
    }
  }

  function clearConfig() {
    setConfig(null)
    setEditingConfig(false)
    setMessages([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading || !config) return

    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          graphContext,
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `request failed (${res.status})`)

      const { display, highlights } = parseHighlights(data.text ?? '')

      setMessages((m) => [
        ...m,
        { role: 'assistant', content: display, highlights },
      ])

      if (highlights.length && typeof onHighlight === 'function') {
        onHighlight(highlights)
      }
    } catch (err) {
      setError(err.message ?? 'something went wrong')
      setMessages((m) => m.slice(0, -1))
      setInput(text)
    } finally {
      setLoading(false)
    }
  }

  const modelLabel = config
    ? PROVIDERS[config.provider]?.models.find((m) => m.id === config.model)?.label ?? config.model
    : null

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-l border-[var(--border)]">
      <header className="px-5 py-3.5 border-b border-[var(--border)] bg-white flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] text-[14px] tracking-tight truncate">
            {config ? modelLabel : 'Chat with your codebase'}
          </h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
            {config
              ? `Connected via ${PROVIDERS[config.provider]?.label ?? config.provider}`
              : 'Connect a provider to start.'}
          </p>
        </div>
        {config && (
          <button
            type="button"
            onClick={() => setEditingConfig((v) => !v)}
            title="Settings"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {!configLoaded && null}

        {configLoaded && !config && (
          <LLMSettings initial={null} onSave={saveConfig} variant="inline" />
        )}

        {configLoaded && config && editingConfig && (
          <div className="space-y-3">
            <LLMSettings
              initial={config}
              onSave={saveConfig}
              onCancel={() => setEditingConfig(false)}
              variant="drawer"
            />
            <button
              type="button"
              onClick={clearConfig}
              className="text-[12px] text-red-600 hover:text-red-700 transition-colors"
            >
              Remove key &amp; disconnect
            </button>
          </div>
        )}

        {configLoaded && config && !editingConfig && messages.length === 0 && !loading && <EmptyState />}

        {configLoaded && config && !editingConfig && messages.map((m, i) => (
          <Message
            key={i}
            role={m.role}
            content={m.content}
            highlights={m.highlights}
            onHighlight={onHighlight}
          />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--green-primary)] animate-pulse" />
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={send} className="p-3.5 border-t border-[var(--border)] bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={config ? 'Ask about your codebase...' : 'Connect a provider above to start.'}
            disabled={loading || !config || editingConfig}
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !config || editingConfig}
            className="px-4 py-2.5 rounded-lg bg-[var(--green-primary)] text-white text-[13px] font-medium hover:bg-[var(--green-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

function EmptyState() {
  const examples = [
    'Where is the graph layout computed?',
    'What does FileNode.js render?',
    'Trace the data flow from parseZip to the graph view.',
    'What will break if I delete buildGraph.js?',
  ]
  return (
    <div className="text-[13px] space-y-2.5">
      <p className="text-[var(--text-secondary)]">Try asking:</p>
      <ul className="space-y-1.5">
        {examples.map((ex) => (
          <li key={ex} className="text-[var(--text-tertiary)]">
            - {ex}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Message({ role, content, highlights, onHighlight }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-[var(--green-primary)] text-white'
            : 'bg-white border border-[var(--border)] text-[var(--text-primary)]'
        }`}
      >
        {content}
        {!isUser && highlights && highlights.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-[var(--border)] flex flex-wrap gap-1.5">
            {highlights.map((path) => (
              <button
                key={path}
                onClick={() => onHighlight?.([path])}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--green-light)] border border-[var(--green-border)] text-[var(--green-primary)] text-[11px] font-mono hover:bg-[rgba(16,163,127,0.15)] transition-colors"
              >
                {path}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function parseHighlights(text) {
  const regex = /\[\[highlight:([^\]]+)\]\]/g
  const highlights = []
  let match
  while ((match = regex.exec(text)) !== null) {
    const path = match[1].trim()
    if (path && !highlights.includes(path)) highlights.push(path)
  }
  const display = text
    .replace(regex, '')
    .replace(/[ \t]+([,.;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { display, highlights }
}

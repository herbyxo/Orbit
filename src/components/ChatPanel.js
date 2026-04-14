'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * ChatPanel - AI chat interface for Orbit.
 *
 * Props:
 *   graphContext: { nodes, edges } - trimmed graph data sent to /api/chat
 *   onHighlight: (paths: string[]) => void - called when AI emits [[highlight:path]] tokens
 */
export default function ChatPanel({ graphContext, onHighlight }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-l border-[var(--border)]">
      <header className="px-5 py-3.5 border-b border-[var(--border)] bg-white">
        <h2 className="font-semibold text-[var(--text-primary)] text-[14px] tracking-tight">
          Chat with your codebase
        </h2>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          Ask questions. Relevant files glow in the graph.
        </p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && !loading && <EmptyState />}

        {messages.map((m, i) => (
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
            placeholder="Ask about your codebase..."
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
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

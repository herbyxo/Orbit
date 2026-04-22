'use client'

import { useEffect, useRef, useState } from 'react'
import { searchNodes } from '@/lib/graphUtils'

/**
 * Cmd+K / Ctrl+K search overlay.
 * Fuzzy-searches node labels and file paths, then centres + selects the result.
 */
export default function SearchOverlay({ nodes, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = searchNodes(nodes, query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, results.length])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSelect(node) {
    onSelect(node.id)
    onClose()
  }

  function handleKeyDown(e) {
    if (!query.trim() || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const node = results[selectedIndex]
      if (node) handleSelect(node)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-[var(--border)] w-full max-w-[480px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to file..."
            className="flex-1 text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          <span className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
            <kbd className="border border-[var(--border)] rounded px-1 py-0.5">↑</kbd>
            <kbd className="border border-[var(--border)] rounded px-1 py-0.5">↓</kbd>
          </span>
          <kbd className="text-[11px] text-[var(--text-tertiary)] border border-[var(--border)] rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {query.trim() && (
          <ul ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-4 py-3 text-[13px] text-[var(--text-tertiary)]">No files match.</li>
            ) : (
              results.map((node, idx) => (
                <li key={node.id}>
                  <button
                    type="button"
                    data-search-index={idx}
                    onClick={() => handleSelect(node)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === selectedIndex
                        ? 'bg-[var(--green-light)] border-l-2 border-l-[var(--green-primary)]'
                        : 'hover:bg-[var(--bg-secondary)] border-l-2 border-l-transparent'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: node.data?.color ?? '#8E8EA0' }}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                        {node.data?.label ?? node.id}
                      </div>
                      <div className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                        {node.data?.fullPath ?? node.id}
                      </div>
                    </div>
                    <div className="ml-auto text-[11px] text-[var(--text-tertiary)] shrink-0">
                      {node.data?.fileType}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {!query.trim() && (
          <div className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">
            Type a filename to jump to it in the graph.
          </div>
        )}
      </div>
    </div>
  )
}

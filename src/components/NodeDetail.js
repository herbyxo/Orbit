'use client'

import { useEffect, useState } from 'react'

const FILE_TYPE_COLORS = {
  page: '#10A37F',
  component: '#3B82F6',
  util: '#8E8EA0',
  api: '#F59E0B',
  config: '#8B5CF6',
}

export default function NodeDetail({ node, onClose }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [node?.id])

  if (!node) return null

  const { data } = node
  const color = FILE_TYPE_COLORS[data.fileType] || '#8E8EA0'

  async function copyPath() {
    try {
      await navigator.clipboard.writeText(data.fullPath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium text-sm text-[var(--text-primary)] truncate">{data.label}</span>
          <span className="text-xs text-[var(--text-tertiary)] font-mono shrink-0">{data.fileType}</span>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1 shrink-0"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Path + copy */}
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-start gap-2">
        <p className="font-mono text-xs text-[var(--text-tertiary)] truncate flex-1 min-w-0" title={data.fullPath}>
          {data.fullPath}
        </p>
        <button
          type="button"
          onClick={copyPath}
          className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {typeof data.loc === 'number' && data.loc > 0 && (
        <div className="px-4 py-1.5 border-b border-[var(--border)] text-[11px] text-[var(--text-tertiary)]">
          <span className="font-mono text-[var(--text-secondary)]">{data.loc}</span> lines
        </div>
      )}

      {/* Imports / Imported By */}
      <div className="px-4 py-3 border-b border-[var(--border)] space-y-2">
        {data.imports.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
              Imports ({data.imports.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {data.imports.map(imp => (
                <span key={imp} className="text-[11px] font-mono px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)]" title={imp}>
                  {imp.split('/').pop()}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.importedBy.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">
              Imported by ({data.importedBy.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {data.importedBy.map(imp => (
                <span key={imp} className="text-[11px] font-mono px-2 py-0.5 bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)]" title={imp}>
                  {imp.split('/').pop()}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.imports.length === 0 && data.importedBy.length === 0 && (
          <p className="text-xs text-[var(--text-tertiary)]">No import relationships.</p>
        )}
      </div>

      {/* File content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-[12px] leading-relaxed font-mono text-[var(--text-secondary)] whitespace-pre-wrap break-words">
          {data.content}
        </pre>
      </div>
    </div>
  )
}

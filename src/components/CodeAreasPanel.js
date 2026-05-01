'use client'

import { useMemo, useState } from 'react'
import { computeCodeAreas, buildScopedGraphContext } from '@/lib/groupUtils'

const TYPE_ORDER = ['page', 'api', 'component', 'util', 'config']

const FILE_TYPE_COLORS = {
  page: '#10A37F',
  component: '#3B82F6',
  util: '#8E8EA0',
  api: '#F59E0B',
  config: '#8B5CF6',
}

export default function CodeAreasPanel({
  graphData,
  graphContext,
  onClose,
  onHighlightPaths,
  onRequestAiSummary,
  llmConfigured,
}) {
  const [expanded, setExpanded] = useState(() => new Set())

  const areas = useMemo(() => computeCodeAreas(graphData), [graphData])

  function toggleArea(path) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-[var(--border)] w-[300px] shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
            Code areas
          </h2>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            Folder groups · boundaries · AI summaries
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors"
          aria-label="Close areas panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
        {areas.map((area) => {
          const scoped = buildScopedGraphContext(graphContext, area.nodeIds)
          const isOpen = expanded.has(area.path)
          const typeKeys = TYPE_ORDER.filter((t) => area.typeCount[t])
          const otherTypes = Object.keys(area.typeCount).filter((t) => !TYPE_ORDER.includes(t))
          const allTypeKeys = [...typeKeys, ...otherTypes]

          return (
            <div
              key={area.path}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleArea(area.path)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <span className="text-[var(--text-tertiary)] mt-0.5 shrink-0">
                  {isOpen ? '▼' : '▶'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-[var(--text-primary)] truncate" title={area.path}>
                    {area.path}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    {area.fileCount} file{area.fileCount !== 1 ? 's' : ''}
                    {area.outboundCount ? ` · ${area.outboundCount} outbound deps` : ''}
                    {area.inboundCount ? ` · ${area.inboundCount} dependants` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {allTypeKeys.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white border border-[var(--border)] text-[var(--text-secondary)]"
                        title={t}
                      >
                        <span
                          className="inline-block w-1 h-1 rounded-full mr-1 align-middle"
                          style={{ backgroundColor: FILE_TYPE_COLORS[t] ?? '#8E8EA0' }}
                        />
                        {t} {area.typeCount[t]}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-2.5 pt-0 space-y-2 border-t border-[var(--border)] bg-white">
                  {(area.outboundCount > 0 || area.inboundCount > 0) && (
                    <div className="text-[10px] text-[var(--text-secondary)] space-y-1 pt-2">
                      {area.outboundCount > 0 && (
                        <p>
                          <span className="font-medium text-[var(--text-primary)]">Imports outside: </span>
                          {area.outboundSample.length
                            ? area.outboundSample.map((p) => p.split('/').pop()).join(', ')
                            : '—'}
                          {area.outboundCount > area.outboundSample.length
                            ? ` +${area.outboundCount - area.outboundSample.length}`
                            : ''}
                        </p>
                      )}
                      {area.inboundCount > 0 && (
                        <p>
                          <span className="font-medium text-[var(--text-primary)]">Used by outside: </span>
                          {area.inboundSample.length
                            ? area.inboundSample.map((p) => p.split('/').pop()).join(', ')
                            : '—'}
                          {area.inboundCount > area.inboundSample.length
                            ? ` +${area.inboundCount - area.inboundSample.length}`
                            : ''}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="max-h-[120px] overflow-y-auto rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1.5">
                    <ul className="space-y-0.5 font-mono text-[9px] text-[var(--text-tertiary)]">
                      {area.nodes.slice(0, 14).map((n) => (
                        <li key={n.id} className="truncate" title={n.id}>
                          {n.data?.fullPath ?? n.id}
                        </li>
                      ))}
                      {area.nodes.length > 14 && (
                        <li className="text-[var(--text-tertiary)] italic">
                          + {area.nodes.length - 14} more
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onHighlightPaths?.(area.nodeIds)}
                      className="text-[10px] font-medium px-2 py-1 rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      Highlight
                    </button>
                    <button
                      type="button"
                      disabled={!llmConfigured || scoped.nodes.length === 0}
                      title={
                        !llmConfigured
                          ? 'Configure chat API key first'
                          : scoped.nodes.length === 0
                          ? 'No files in this area'
                          : 'Summarise this area in chat'
                      }
                      onClick={() =>
                        onRequestAiSummary?.(area.path, scoped)
                      }
                      className="text-[10px] font-medium px-2 py-1 rounded-md bg-[var(--green-primary)] text-white hover:bg-[var(--green-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      AI summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

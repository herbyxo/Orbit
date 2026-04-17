'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Graph from '@/components/Graph'
import NodeDetail from '@/components/NodeDetail'
import ChatPanel from '@/components/ChatPanel'
import SearchOverlay from '@/components/SearchOverlay'
import { buildGraphContext } from '@/lib/graphContext'
import { computeImpact } from '@/lib/graphUtils'

const FILE_TYPE_COLORS = {
  page: '#10A37F',
  component: '#3B82F6',
  util: '#8E8EA0',
  api: '#F59E0B',
  config: '#8B5CF6',
}

export default function GraphPage() {
  const router = useRouter()
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [highlightedPaths, setHighlightedPaths] = useState([])
  const [chatOpen, setChatOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  // Impact mode
  const [impactMode, setImpactMode] = useState(false)
  const [impact, setImpact] = useState(null)

  // Node type visibility (set of hidden types)
  const [hiddenTypes, setHiddenTypes] = useState(new Set())

  // Focus a node in the graph (from search)
  const [focusNodeId, setFocusNodeId] = useState(null)

  // Search overlay
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('orbit-graph')
    if (!stored) {
      router.push('/')
      return
    }
    try {
      setGraphData(JSON.parse(stored))
    } catch {
      router.push('/')
    }
    setLoading(false)
  }, [router])

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const graphContext = useMemo(() => buildGraphContext(graphData), [graphData])

  const handleHighlight = useCallback((paths) => {
    setHighlightedPaths(paths)
  }, [])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node)
    if (impactMode && graphData) {
      setImpact(computeImpact(node.id, graphData.edges))
    } else {
      setImpact(null)
    }
  }, [impactMode, graphData])

  function toggleImpactMode() {
    setImpactMode(v => {
      if (v) setImpact(null)
      return !v
    })
  }

  function toggleType(type) {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function handleSearchSelect(nodeId) {
    const node = graphData?.nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedNode(node)
      setFocusNodeId({ id: nodeId, ts: Date.now() })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--green-primary)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[var(--text-tertiary)]">Loading graph...</p>
        </div>
      </div>
    )
  }

  if (!graphData) return null

  const allTypes = [...new Set(graphData.nodes.map(n => n.data.fileType))]

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-white shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 no-underline">
            <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(-30 16 16)" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />
              <ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(30 16 16)" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="3" fill="var(--green-primary)" />
            </svg>
            <span className="font-semibold text-[15px] text-[var(--text-primary)] tracking-tight">Orbit</span>
          </a>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
            <span>{graphData.nodes.length} files</span>
            <span>{graphData.edges.length} connections</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter pills */}
          <div className="flex items-center gap-1.5">
            {allTypes.map(type => {
              const color = FILE_TYPE_COLORS[type] ?? '#8E8EA0'
              const hidden = hiddenTypes.has(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  title={hidden ? `Show ${type}` : `Hide ${type}`}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors ${
                    hidden
                      ? 'text-[var(--text-tertiary)] border border-dashed border-[var(--border)] opacity-50'
                      : 'text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hidden ? '#ccc' : color }} />
                  {type}
                </button>
              )
            })}
          </div>

          <div className="h-4 w-px bg-[var(--border)]" />

          {/* Impact Mode toggle */}
          <button
            onClick={toggleImpactMode}
            title="Impact mode — click a node to see blast radius"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
              impactMode
                ? 'bg-orange-50 text-orange-600 border border-orange-200'
                : 'text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Impact
          </button>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            title="Search files (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <kbd className="text-[10px] text-[var(--text-tertiary)]">⌘K</kbd>
          </button>

          <div className="h-4 w-px bg-[var(--border)]" />

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors ${
              chatOpen
                ? 'bg-[var(--green-light)] text-[var(--green-primary)] border border-[var(--green-border)]'
                : 'text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0">
          <Graph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            highlightedPaths={highlightedPaths}
            impact={impact}
            hiddenTypes={hiddenTypes}
            focusNodeId={focusNodeId}
          />
        </div>

        {selectedNode && (
          <div className="w-[380px] shrink-0 overflow-hidden">
            <NodeDetail node={selectedNode} onClose={() => { setSelectedNode(null); setImpact(null) }} />
          </div>
        )}

        {chatOpen && (
          <div className="w-[380px] shrink-0 overflow-hidden">
            <ChatPanel graphContext={graphContext} onHighlight={handleHighlight} />
          </div>
        )}
      </div>

      {searchOpen && (
        <SearchOverlay
          nodes={graphData.nodes}
          onSelect={handleSearchSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  )
}

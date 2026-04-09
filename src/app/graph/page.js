'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Graph from '@/components/Graph'
import NodeDetail from '@/components/NodeDetail'

export default function GraphPage() {
  const router = useRouter()
  const [graphData, setGraphData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const stats = {
    files: graphData.nodes.length,
    edges: graphData.edges.length,
    types: [...new Set(graphData.nodes.map(n => n.data.fileType))],
  }

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
            <span>{stats.files} files</span>
            <span>{stats.edges} connections</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          {[
            { type: 'page', color: '#10A37F' },
            { type: 'component', color: '#3B82F6' },
            { type: 'util', color: '#8E8EA0' },
            { type: 'api', color: '#F59E0B' },
            { type: 'config', color: '#8B5CF6' },
          ]
            .filter(t => stats.types.includes(t.type))
            .map(t => (
              <div key={t.type} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-[11px] text-[var(--text-tertiary)]">{t.type}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Graph + detail panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 transition-all ${selectedNode ? '' : ''}`}>
          <Graph graphData={graphData} onNodeClick={(node) => setSelectedNode(node)} />
        </div>

        {selectedNode && (
          <div className="w-[380px] shrink-0 overflow-hidden">
            <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>
    </div>
  )
}

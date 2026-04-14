'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import FileNode from './FileNode'

const nodeTypes = { fileNode: FileNode }

/**
 * Run d3-force simulation to compute node positions.
 */
function layoutNodes(graphNodes, graphEdges) {
  const simNodes = graphNodes.map(n => ({ id: n.id, ...n }))
  const simLinks = graphEdges.map(e => ({ source: e.source, target: e.target }))

  const simulation = forceSimulation(simNodes)
    .force('link', forceLink(simLinks).id(d => d.id).distance(150))
    .force('charge', forceManyBody().strength(-400))
    .force('center', forceCenter(500, 400))
    .force('collide', forceCollide(80))
    .stop()

  for (let i = 0; i < 200; i++) simulation.tick()

  const posMap = {}
  simNodes.forEach(n => {
    posMap[n.id] = { x: n.x, y: n.y }
  })

  return graphNodes.map(n => ({
    ...n,
    position: posMap[n.id] || { x: 0, y: 0 },
  }))
}

function GraphInner({ graphData, onNodeClick, highlightedPaths }) {
  const laidOutNodes = useMemo(
    () => layoutNodes(graphData.nodes, graphData.edges),
    [graphData]
  )

  const [nodes, , onNodesChange] = useNodesState(laidOutNodes)
  const [edges, , onEdgesChange] = useEdgesState(
    graphData.edges.map(e => ({
      ...e,
      style: { stroke: '#CDCDD1', strokeWidth: 1 },
      type: 'default',
    }))
  )

  const [hoveredId, setHoveredId] = useState(null)

  // Pre-compute adjacency for hover-dim behaviour.
  const neighbours = useMemo(() => {
    const map = new Map()
    for (const n of nodes) map.set(n.id, new Set([n.id]))
    for (const e of edges) {
      map.get(e.source)?.add(e.target)
      map.get(e.target)?.add(e.source)
    }
    return map
  }, [nodes, edges])

  // Decorate nodes with hover + highlight flags each render.
  // Keeps `nodes` state clean for React Flow's internal tracking (drag, etc.)
  const displayNodes = useMemo(() => {
    const highlightSet = new Set(highlightedPaths ?? [])
    const focused = hoveredId ? neighbours.get(hoveredId) : null

    return nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        isHighlighted: highlightSet.has(n.data?.fullPath ?? n.id),
        isDimmed: focused ? !focused.has(n.id) : false,
        isFocused: n.id === hoveredId,
      },
    }))
  }, [nodes, hoveredId, neighbours, highlightedPaths])

  // Decorate edges - fade unrelated ones on hover, glow hovered ones.
  const displayEdges = useMemo(() => {
    if (!hoveredId) return edges
    return edges.map(e => {
      const connected = e.source === hoveredId || e.target === hoveredId
      return {
        ...e,
        animated: connected,
        style: {
          ...(e.style ?? {}),
          opacity: connected ? 1 : 0.15,
          stroke: connected ? '#10A37F' : '#CDCDD1',
          strokeWidth: connected ? 2 : 1,
        },
      }
    })
  }, [edges, hoveredId])

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) onNodeClick(node)
  }, [onNodeClick])

  const handleNodeMouseEnter = useCallback((_e, node) => {
    setHoveredId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredId(null)
  }, [])

  return (
    <ReactFlow
      nodes={displayNodes}
      edges={displayEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--border)" gap={32} size={1} />
      <Controls
        showInteractive={false}
        className="!bg-white !border-[var(--border)] !rounded-lg !shadow-sm"
      />
    </ReactFlow>
  )
}

export default function Graph({ graphData, onNodeClick, highlightedPaths }) {
  if (!graphData || !graphData.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-sm">
        No files found to visualise.
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <GraphInner
        graphData={graphData}
        onNodeClick={onNodeClick}
        highlightedPaths={highlightedPaths}
      />
    </ReactFlowProvider>
  )
}

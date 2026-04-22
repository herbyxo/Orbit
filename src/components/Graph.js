'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import FileNode from './FileNode'

const nodeTypes = { fileNode: FileNode }

/**
 * LOC-based collide radius for d3-force — mirrors FileNode size tiers so
 * the layout gives physically larger nodes more breathing room.
 */
function collideRadius(node) {
  const loc = node.data?.loc ?? 0
  if (loc > 200) return 105
  if (loc > 80) return 88
  return 72
}

/**
 * Run d3-force simulation to compute node positions.
 */
function layoutNodes(graphNodes, graphEdges) {
  const simNodes = graphNodes.map(n => ({ id: n.id, ...n }))
  const simLinks = graphEdges.map(e => ({ source: e.source, target: e.target }))

  const simulation = forceSimulation(simNodes)
    .force('link', forceLink(simLinks).id(d => d.id).distance(160))
    .force('charge', forceManyBody().strength(-450))
    .force('center', forceCenter(500, 400))
    .force('collide', forceCollide(collideRadius))
    .stop()

  for (let i = 0; i < 200; i++) simulation.tick()

  const posMap = {}
  simNodes.forEach(n => { posMap[n.id] = { x: n.x, y: n.y } })

  return graphNodes.map(n => ({
    ...n,
    position: posMap[n.id] || { x: 0, y: 0 },
  }))
}

/**
 * @param {Object} props
 * @param {Object} props.graphData
 * @param {Function} props.onNodeClick
 * @param {string[]} props.highlightedPaths
 * @param {{ centerId: string, ancestors: Set<string>, descendants: Set<string> } | null} props.impact
 * @param {Set<string>} props.hiddenTypes
 * @param {{ id: string, ts: number } | null} props.focusNodeId - pan to this node (from search)
 * @param {{ count: number, cycleNodes: Set<string>, cycleEdgeIds: Set<string> } | null} props.cycleInfo
 */
function GraphInner({ graphData, onNodeClick, highlightedPaths, impact, hiddenTypes, focusNodeId, cycleInfo }) {
  const reactFlow = useReactFlow()

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

  // Subgraph focus — double-click a node to zoom to its 2-degree neighbourhood.
  const [subgraphFocusId, setSubgraphFocusId] = useState(null)

  // Pan to focusNodeId (from search) when it changes.
  useEffect(() => {
    if (!focusNodeId?.id) return
    const node = nodes.find(n => n.id === focusNodeId.id)
    if (!node) return
    reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1.4, duration: 600 })
  }, [focusNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fit when entering / exiting subgraph focus.
  useEffect(() => {
    const padding = subgraphFocusId ? 0.35 : 0.2
    const duration = 500
    const id = setTimeout(() => reactFlow.fitView({ padding, duration }), 60)
    return () => clearTimeout(id)
  }, [subgraphFocusId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // 2-degree neighbourhood for subgraph focus.
  const focusSubgraph = useMemo(() => {
    if (!subgraphFocusId) return null
    const scope = new Set([subgraphFocusId])
    for (const e of edges) {
      if (e.source === subgraphFocusId) scope.add(e.target)
      if (e.target === subgraphFocusId) scope.add(e.source)
    }
    const deg1 = new Set(scope)
    for (const e of edges) {
      if (deg1.has(e.source)) scope.add(e.target)
      if (deg1.has(e.target)) scope.add(e.source)
    }
    return scope
  }, [subgraphFocusId, edges])

  const displayNodes = useMemo(() => {
    const highlightSet = new Set(highlightedPaths ?? [])
    const focused = hoveredId ? neighbours.get(hoveredId) : null
    const hiddenSet = hiddenTypes ?? new Set()

    return nodes.map(n => {
      const typeHidden = hiddenSet.has(n.data?.fileType)
      const focusHidden = focusSubgraph ? !focusSubgraph.has(n.id) : false
      return {
        ...n,
        hidden: typeHidden || focusHidden,
        data: {
          ...n.data,
          isHighlighted: highlightSet.has(n.data?.fullPath ?? n.id),
          isDimmed: focused ? !focused.has(n.id) : false,
          isFocused: n.id === hoveredId,
          isImpactCenter: impact?.centerId === n.id,
          isAncestor: impact ? impact.ancestors.has(n.id) : false,
          isDescendant: impact ? impact.descendants.has(n.id) : false,
          isCircularDep: cycleInfo ? cycleInfo.cycleNodes.has(n.id) : false,
        },
      }
    })
  }, [nodes, hoveredId, neighbours, highlightedPaths, impact, hiddenTypes, focusSubgraph, cycleInfo])

  const displayEdges = useMemo(() => {
    const hiddenSet = hiddenTypes ?? new Set()

    const visibleIds = new Set(
      nodes
        .filter(n =>
          !hiddenSet.has(n.data?.fileType) &&
          (!focusSubgraph || focusSubgraph.has(n.id))
        )
        .map(n => n.id)
    )

    return edges.map(e => {
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) {
        return { ...e, hidden: true }
      }

      const isCycleEdge = cycleInfo?.cycleEdgeIds.has(e.id) ?? false

      // Impact edge colouring takes priority.
      if (impact) {
        const srcIsCenter = e.source === impact.centerId
        const tgtIsCenter = e.target === impact.centerId
        const srcIsAnc = impact.ancestors.has(e.source)
        const tgtIsAnc = impact.ancestors.has(e.target)
        const srcIsDesc = impact.descendants.has(e.source)
        const tgtIsDesc = impact.descendants.has(e.target)

        const ancestorEdge = (srcIsAnc && tgtIsCenter) || (srcIsAnc && tgtIsAnc)
        const descendantEdge = (srcIsCenter && tgtIsDesc) || (srcIsDesc && tgtIsDesc)

        if (ancestorEdge) return { ...e, hidden: false, animated: false, style: { stroke: '#f87171', strokeWidth: 1.5, opacity: 0.8 } }
        if (descendantEdge) return { ...e, hidden: false, animated: false, style: { stroke: '#60a5fa', strokeWidth: 1.5, opacity: 0.8 } }
        return { ...e, hidden: false, style: { stroke: '#CDCDD1', strokeWidth: 0.5, opacity: 0.2 } }
      }

      // Cycle edges: always red when no other mode overrides.
      if (isCycleEdge) {
        return {
          ...e,
          hidden: false,
          animated: true,
          style: { stroke: '#EF4444', strokeWidth: 1.5, opacity: 0.7 },
        }
      }

      // Hover behaviour.
      if (!hoveredId) return { ...e, hidden: false }
      const connected = e.source === hoveredId || e.target === hoveredId
      return {
        ...e,
        hidden: false,
        animated: connected,
        style: {
          ...(e.style ?? {}),
          opacity: connected ? 1 : 0.15,
          stroke: connected ? '#10A37F' : '#CDCDD1',
          strokeWidth: connected ? 2 : 1,
        },
      }
    })
  }, [edges, hoveredId, impact, hiddenTypes, nodes, focusSubgraph, cycleInfo])

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) onNodeClick(node)
  }, [onNodeClick])

  const handleNodeDoubleClick = useCallback((_e, node) => {
    setSubgraphFocusId(prev => prev === node.id ? null : node.id)
  }, [])

  const handleNodeMouseEnter = useCallback((_e, node) => {
    setHoveredId(node.id)
  }, [])

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredId(null)
  }, [])

  const focusedNodeLabel = subgraphFocusId
    ? (nodes.find(n => n.id === subgraphFocusId)?.data?.label ?? subgraphFocusId)
    : null

  return (
    <ReactFlow
      nodes={displayNodes}
      edges={displayEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="orbit-graph-surface"
    >
      <Background color="var(--border)" gap={32} size={1} />
      <Controls
        showInteractive={false}
        className="!bg-white !border-[var(--border)] !rounded-lg !shadow-sm"
      />

      {/* top-left: subgraph focus badge when active, otherwise fit-view button */}
      <Panel position="top-left">
        {subgraphFocusId ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--border)] rounded-lg shadow-sm text-[12px]">
            <div className="w-2 h-2 rounded-full bg-[var(--green-primary)] shrink-0" />
            <span className="font-medium text-[var(--text-primary)] font-mono">{focusedNodeLabel}</span>
            <span className="text-[var(--text-tertiary)]">· 2° focus</span>
            <button
              onClick={() => setSubgraphFocusId(null)}
              className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors leading-none"
              title="Exit focus"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => reactFlow.fitView({ padding: 0.2, duration: 380 })}
            title="Fit entire graph in view"
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] bg-white border border-[var(--border)] shadow-sm hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Fit view
          </button>
        )}
      </Panel>

      <MiniMap
        nodeStrokeWidth={2}
        nodeColor={(n) => n.data?.color ?? '#8E8EA0'}
        maskColor="rgba(247, 247, 248, 0.92)"
        className="!bg-white !border !border-[var(--border)] !rounded-lg !shadow-sm !m-3"
        pannable
        zoomable
      />
    </ReactFlow>
  )
}

export default function Graph({ graphData, onNodeClick, highlightedPaths, impact, hiddenTypes, focusNodeId, cycleInfo }) {
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
        impact={impact}
        hiddenTypes={hiddenTypes}
        focusNodeId={focusNodeId}
        cycleInfo={cycleInfo}
      />
    </ReactFlowProvider>
  )
}

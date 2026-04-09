'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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

  // Run simulation ticks
  for (let i = 0; i < 200; i++) simulation.tick()

  // Map computed positions back to nodes
  const posMap = {}
  simNodes.forEach(n => {
    posMap[n.id] = { x: n.x, y: n.y }
  })

  return graphNodes.map(n => ({
    ...n,
    position: posMap[n.id] || { x: 0, y: 0 },
  }))
}

function GraphInner({ graphData, onNodeClick }) {
  const laidOutNodes = useMemo(
    () => layoutNodes(graphData.nodes, graphData.edges),
    [graphData]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(laidOutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    graphData.edges.map(e => ({
      ...e,
      style: { stroke: '#CDCDD1', strokeWidth: 1 },
      type: 'default',
    }))
  )

  const handleNodeClick = useCallback((event, node) => {
    if (onNodeClick) onNodeClick(node)
  }, [onNodeClick])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
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

export default function Graph({ graphData, onNodeClick }) {
  if (!graphData || !graphData.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] text-sm">
        No files found to visualise.
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <GraphInner graphData={graphData} onNodeClick={onNodeClick} />
    </ReactFlowProvider>
  )
}

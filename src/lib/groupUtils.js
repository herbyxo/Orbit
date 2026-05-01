/**
 * groupUtils.js
 * Derive folder "areas" (coarse groups) from graph paths and build scoped graph context for AI.
 */

/**
 * Directory portion of a file path (no trailing slash).
 * @param {string} fullPath
 * @returns {string} empty string if file is at repo root
 */
export function fileDirname(fullPath) {
  if (!fullPath || typeof fullPath !== 'string') return ''
  const i = fullPath.lastIndexOf('/')
  return i <= 0 ? '' : fullPath.slice(0, i)
}

/**
 * Bucket paths into a stable two-segment prefix (first / second dir under root).
 * Example: src/app/graph → src/app; packages/ui/Button → packages/ui
 * @param {string} dir
 */
export function areaKeyFromDir(dir) {
  if (!dir) return '(root)'
  const parts = dir.split('/').filter(Boolean)
  if (parts.length === 0) return '(root)'
  if (parts.length === 1) return parts[0]
  return `${parts[0]}/${parts[1]}`
}

/** @param {{ id: string, data?: { fullPath?: string } }} node */
function nodePath(node) {
  return node.data?.fullPath ?? node.id
}

/**
 * Build coarse code areas from graph nodes.
 *
 * @param {{ nodes: Array, edges: Array }} graphData
 * @returns {Array<{
 *   path: string,
 *   nodeIds: string[],
 *   nodes: Array,
 *   fileCount: number,
 *   typeCount: Record<string, number>,
 *   outboundCount: number,
 *   inboundCount: number,
 *   outboundSample: string[],
 *   inboundSample: string[]
 * }>}
 */
export function computeCodeAreas(graphData) {
  if (!graphData?.nodes?.length) return []

  const byArea = new Map()

  for (const n of graphData.nodes) {
    const path = nodePath(n)
    const key = areaKeyFromDir(fileDirname(path))
    if (!byArea.has(key)) {
      byArea.set(key, { path: key, nodeIds: [], nodes: [] })
    }
    const entry = byArea.get(key)
    entry.nodes.push(n)
    entry.nodeIds.push(n.id)
  }

  const areas = []

  for (const entry of byArea.values()) {
    const idSet = new Set(entry.nodeIds)
    const typeCount = {}
    for (const n of entry.nodes) {
      const t = n.data?.fileType ?? 'unknown'
      typeCount[t] = (typeCount[t] ?? 0) + 1
    }

    const outbound = new Set()
    const inbound = new Set()
    for (const n of entry.nodes) {
      for (const imp of n.data?.imports ?? []) {
        if (!idSet.has(imp)) outbound.add(imp)
      }
      for (const by of n.data?.importedBy ?? []) {
        if (!idSet.has(by)) inbound.add(by)
      }
    }

    areas.push({
      path: entry.path,
      nodeIds: entry.nodeIds,
      nodes: entry.nodes,
      fileCount: entry.nodes.length,
      typeCount,
      outboundCount: outbound.size,
      inboundCount: inbound.size,
      outboundSample: [...outbound].slice(0, 6),
      inboundSample: [...inbound].slice(0, 6),
    })
  }

  areas.sort((a, b) => b.fileCount - a.fileCount)
  return areas
}

/**
 * Narrow full graph context to a subset of node ids (same shape as buildGraphContext output).
 *
 * @param {{ nodes: Array, edges: Array } | null} graphContext
 * @param {string[]} nodeIds
 */
export function buildScopedGraphContext(graphContext, nodeIds) {
  if (!graphContext?.nodes) {
    return { nodes: [], edges: [] }
  }
  const idSet = new Set(nodeIds)
  const nodes = graphContext.nodes.filter((n) => idSet.has(n.id))
  const ids = new Set(nodes.map((n) => n.id))
  const edges = (graphContext.edges ?? []).filter(
    (e) => ids.has(e.source) && ids.has(e.target)
  )
  return { nodes, edges }
}

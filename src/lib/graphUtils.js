/**
 * graphUtils.js
 * Graph analysis utilities — impact traversal, search helpers.
 */

/**
 * Compute the impact of a node: which nodes would break if it changed (ancestors),
 * and which nodes it depends on (descendants).
 *
 * Edges are { source, target } where source IMPORTS target.
 *   ancestors   = nodes that transitively import nodeId → they break if nodeId changes
 *   descendants = nodes that nodeId transitively imports → its dependencies
 *
 * @param {string} nodeId
 * @param {Array<{source: string, target: string}>} edges
 * @returns {{ centerId: string, ancestors: Set<string>, descendants: Set<string> }}
 */
export function computeImpact(nodeId, edges) {
  const forward = new Map()  // A → Set(B): A imports B
  const backward = new Map() // B → Set(A): A imports B

  for (const e of edges) {
    if (!forward.has(e.source)) forward.set(e.source, new Set())
    forward.get(e.source).add(e.target)
    if (!backward.has(e.target)) backward.set(e.target, new Set())
    backward.get(e.target).add(e.source)
  }

  function bfs(startId, adjMap) {
    const visited = new Set()
    const queue = [startId]
    while (queue.length) {
      const curr = queue.shift()
      for (const next of (adjMap.get(curr) ?? [])) {
        if (!visited.has(next)) {
          visited.add(next)
          queue.push(next)
        }
      }
    }
    return visited
  }

  return {
    centerId: nodeId,
    ancestors: bfs(nodeId, backward),    // upstream — would break if nodeId changes
    descendants: bfs(nodeId, forward),   // downstream — what nodeId depends on
  }
}

/**
 * Simple substring search over graph nodes.
 * Returns up to `limit` nodes ranked by match position in label then fullPath.
 *
 * @param {Array} nodes - React Flow nodes with data.label / data.fullPath
 * @param {string} query
 * @param {number} limit
 * @returns {Array}
 */
export function searchNodes(nodes, query, limit = 8) {
  if (!query.trim()) return []
  const q = query.toLowerCase()

  const scored = nodes
    .map((n) => {
      const label = (n.data?.label ?? '').toLowerCase()
      const path = (n.data?.fullPath ?? n.id).toLowerCase()
      const li = label.indexOf(q)
      const pi = path.indexOf(q)
      if (li < 0 && pi < 0) return null
      const score = li >= 0 ? li : 100 + pi
      return { node: n, score }
    })
    .filter(Boolean)

  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((r) => r.node)
}

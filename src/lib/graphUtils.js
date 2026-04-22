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

/**
 * Detect circular dependencies using Tarjan's SCC algorithm.
 * An SCC with >1 node = a cycle in the import graph.
 *
 * Edges are { source, target } where source IMPORTS target.
 *
 * @param {Array} nodes - graph nodes with .id
 * @param {Array} edges - graph edges with .source, .target, .id
 * @returns {{ count: number, cycleNodes: Set<string>, cycleEdgeIds: Set<string> }}
 */
export function detectCycles(nodes, edges) {
  // Build adjacency list
  const adj = new Map()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    if (adj.has(e.source)) adj.get(e.source).push(e.target)
  }

  const indexMap = new Map()
  const lowlink = new Map()
  const onStack = new Set()
  const stack = []
  const sccs = [] // only SCCs with >1 node (actual cycles)
  let counter = 0

  function strongconnect(v) {
    indexMap.set(v, counter)
    lowlink.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)

    for (const w of (adj.get(v) ?? [])) {
      if (!indexMap.has(w)) {
        strongconnect(w)
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)))
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), indexMap.get(w)))
      }
    }

    if (lowlink.get(v) === indexMap.get(v)) {
      const scc = new Set()
      let w
      do {
        w = stack.pop()
        onStack.delete(w)
        scc.add(w)
      } while (w !== v)
      if (scc.size > 1) sccs.push(scc)
    }
  }

  for (const n of nodes) {
    if (!indexMap.has(n.id)) strongconnect(n.id)
  }

  // Build lookup sets
  const cycleNodes = new Set()
  const nodeScc = new Map()
  sccs.forEach((scc, i) => {
    for (const id of scc) {
      cycleNodes.add(id)
      nodeScc.set(id, i)
    }
  })

  // An edge is a cycle edge if both endpoints sit in the same SCC.
  // Edge ids match `${source}->${target}` format from buildGraph.
  const cycleEdgeIds = new Set()
  for (const e of edges) {
    if (
      nodeScc.has(e.source) &&
      nodeScc.has(e.target) &&
      nodeScc.get(e.source) === nodeScc.get(e.target)
    ) {
      cycleEdgeIds.add(e.id ?? `${e.source}->${e.target}`)
    }
  }

  return { count: sccs.length, cycleNodes, cycleEdgeIds }
}

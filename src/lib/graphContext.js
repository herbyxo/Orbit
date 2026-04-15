/**
 * buildGraphContext
 * Strips React Flow-only fields (position, color, measured, etc.) and keeps
 * only what the AI API needs: path, type, imports, importedBy, content.
 */
export function buildGraphContext(graphData) {
  if (!graphData) return null
  const { nodes = [], edges = [] } = graphData

  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      data: {
        fullPath: n.data?.fullPath ?? n.id,
        fileType: n.data?.fileType ?? 'unknown',
        imports: n.data?.imports ?? [],
        importedBy: n.data?.importedBy ?? [],
        content: n.data?.content ?? '',
      },
    })),
    edges: edges.map((e) => ({ source: e.source, target: e.target })),
  }
}

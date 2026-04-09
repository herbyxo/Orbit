/**
 * buildGraph.js
 * Takes a map of { filePath: fileContent } and produces React Flow nodes + edges.
 * Runs import extraction, resolves paths, classifies file types, and builds the graph data model.
 */

import { extractImports, resolveImport } from './extractImports'

const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs']

/**
 * Classify a file into a type based on its path.
 */
function classifyFile(filePath) {
  if (/app\/api\//.test(filePath)) return 'api'
  if (/app\/.*\/page\.(js|jsx|ts|tsx)$/.test(filePath)) return 'page'
  if (/app\/page\.(js|jsx|ts|tsx)$/.test(filePath)) return 'page'
  if (/(^|\/)components\//.test(filePath)) return 'component'
  if (/(^\/)(lib|utils|helpers)\//.test(filePath)) return 'util'
  if (/\.(config|rc)\.(js|ts|mjs|cjs)$/.test(filePath)) return 'config'
  if (/(^|\/)hooks\//.test(filePath)) return 'util'
  if (/(^|\/)styles\//.test(filePath)) return 'config'
  return 'component' // default for other JS files
}

/**
 * Map file type to a colour for the graph node.
 */
const FILE_TYPE_COLORS = {
  page: '#10A37F',
  component: '#3B82F6',
  util: '#8E8EA0',
  api: '#F59E0B',
  config: '#8B5CF6',
}

/**
 * Build graph data from a file map.
 * @param {Object} files - { 'src/app/page.js': 'file content...', ... }
 * @returns {{ nodes: Array, edges: Array, files: Object }} - React Flow compatible data
 */
export function buildGraph(files) {
  const filePaths = new Set(Object.keys(files))

  // Only process JS/TS files for import analysis
  const jsFiles = Object.entries(files).filter(([path]) =>
    JS_EXTENSIONS.some(ext => path.endsWith(ext))
  )

  // Extract imports for each file
  const importMap = {} // filePath → [resolvedImportPaths]
  const importedByMap = {} // filePath → [files that import this]

  // Init importedBy for all files
  for (const path of filePaths) {
    importedByMap[path] = []
  }

  for (const [filePath, content] of jsFiles) {
    const rawImports = extractImports(content)
    const resolved = rawImports
      .map(spec => resolveImport(spec, filePath, filePaths))
      .filter(Boolean)

    importMap[filePath] = resolved

    for (const target of resolved) {
      if (!importedByMap[target]) importedByMap[target] = []
      importedByMap[target].push(filePath)
    }
  }

  // Build nodes — only include JS/TS files
  const nodes = jsFiles.map(([filePath]) => {
    const fileName = filePath.split('/').pop()
    const fileType = classifyFile(filePath)

    return {
      id: filePath,
      type: 'fileNode',
      data: {
        label: fileName,
        fullPath: filePath,
        fileType,
        color: FILE_TYPE_COLORS[fileType] || '#8E8EA0',
        content: files[filePath],
        imports: importMap[filePath] || [],
        importedBy: importedByMap[filePath] || [],
      },
      position: { x: 0, y: 0 }, // will be set by d3-force layout
    }
  })

  // Build edges
  const edges = []
  for (const [source, targets] of Object.entries(importMap)) {
    for (const target of targets) {
      edges.push({
        id: `${source}->${target}`,
        source,
        target,
        animated: false,
      })
    }
  }

  return { nodes, edges, files }
}

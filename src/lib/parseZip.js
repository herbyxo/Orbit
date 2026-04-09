/**
 * parseZip.js
 * Takes a JSZip instance, extracts all relevant files, and returns graph data.
 * Runs client-side — no server round-trip needed.
 */

import { buildGraph } from './buildGraph'

const IGNORE_DIRS = [
  'node_modules', '.git', '.next', 'dist', 'build', '.cache',
  '.vercel', '.turbo', 'coverage', '__pycache__', '.DS_Store',
]

const INCLUDE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
]

/**
 * Check if a file path should be included in the analysis.
 */
function shouldInclude(filePath) {
  // Skip ignored directories
  for (const dir of IGNORE_DIRS) {
    if (filePath.includes(`/${dir}/`) || filePath.startsWith(`${dir}/`)) {
      return false
    }
  }

  // Only include JS/TS files
  return INCLUDE_EXTENSIONS.some(ext => filePath.endsWith(ext))
}

/**
 * Normalize file paths from a zip.
 * Zips often have a root folder (e.g., 'my-project/src/...').
 * We detect and strip this common prefix so paths look like 'src/...'.
 */
function stripRootFolder(paths) {
  if (paths.length === 0) return { prefix: '', paths }

  // Find common prefix
  const parts = paths[0].split('/')
  let prefixDepth = 0

  for (let i = 0; i < parts.length - 1; i++) {
    const prefix = parts.slice(0, i + 1).join('/') + '/'
    if (paths.every(p => p.startsWith(prefix))) {
      prefixDepth = i + 1
    } else {
      break
    }
  }

  const prefix = parts.slice(0, prefixDepth).join('/')
  const stripped = prefix
    ? paths.map(p => p.slice(prefix.length + 1))
    : paths

  return { prefix, paths: stripped }
}

/**
 * Parse a JSZip instance into graph data.
 * @param {JSZip} zip - A loaded JSZip instance
 * @returns {Promise<{ nodes: Array, edges: Array, files: Object }>}
 */
export async function parseZipFiles(zip) {
  const files = {}
  const allPaths = []

  // Collect all file paths first
  zip.forEach((relativePath, file) => {
    if (!file.dir) {
      allPaths.push(relativePath)
    }
  })

  // Strip common root folder
  const { prefix, paths: normalizedPaths } = stripRootFolder(allPaths)

  // Build a mapping from original to normalized paths
  const pathMap = {}
  allPaths.forEach((original, i) => {
    pathMap[original] = normalizedPaths[i]
  })

  // Extract file contents for included files
  const promises = []
  for (const [originalPath, normalizedPath] of Object.entries(pathMap)) {
    if (shouldInclude(normalizedPath)) {
      const file = zip.file(originalPath)
      if (file) {
        promises.push(
          file.async('string').then(content => {
            files[normalizedPath] = content
          })
        )
      }
    }
  }

  await Promise.all(promises)

  return buildGraph(files)
}

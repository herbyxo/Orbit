/**
 * extractImports.js
 * Extracts relative import paths from JS/JSX/TS/TSX file content.
 * Returns an array of raw import strings (e.g., './Header', '../lib/utils').
 * Only keeps relative imports — skips node_modules / bare specifiers.
 */

const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g
const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g

export function extractImports(fileContent) {
  const imports = new Set()

  for (const regex of [importRegex, requireRegex, dynamicImportRegex]) {
    // Reset lastIndex since we reuse regex objects
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(fileContent)) !== null) {
      const specifier = match[1]
      // Only keep relative imports
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        imports.add(specifier)
      }
    }
  }

  return [...imports]
}

/**
 * Resolves a relative import specifier to an absolute path within the project.
 * Handles missing extensions by trying common JS/TS extensions.
 * 
 * @param {string} specifier - The import path (e.g., './Header')
 * @param {string} importerPath - The file doing the importing (e.g., 'src/app/page.js')
 * @param {Set<string>} allFilePaths - Set of all file paths in the project
 * @returns {string|null} - Resolved absolute path, or null if not found
 */
export function resolveImport(specifier, importerPath, allFilePaths) {
  // Get directory of the importing file
  const parts = importerPath.split('/')
  parts.pop() // remove filename
  const importerDir = parts.join('/')

  // Build the base path
  const segments = specifier.split('/')
  const resolved = []

  // Start from importer directory
  if (importerDir) resolved.push(...importerDir.split('/'))

  for (const seg of segments) {
    if (seg === '.') continue
    if (seg === '..') { resolved.pop(); continue }
    resolved.push(seg)
  }

  const basePath = resolved.join('/')

  // Try exact match first
  if (allFilePaths.has(basePath)) return basePath

  // Try adding extensions
  const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs']
  for (const ext of extensions) {
    if (allFilePaths.has(basePath + ext)) return basePath + ext
  }

  // Try index files (import './components' → './components/index.js')
  for (const ext of extensions) {
    const indexPath = basePath + '/index' + ext
    if (allFilePaths.has(indexPath)) return indexPath
  }

  return null
}

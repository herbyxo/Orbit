/**
 * parseRepo.js
 * Fetches a public GitHub repo via REST API and returns graph data.
 * Runs server-side. Uses GITHUB_TOKEN if set to raise rate limit 60/hr -> 5000/hr.
 *
 * Accepts:
 *   - full URL:   https://github.com/owner/repo
 *   - with path:  https://github.com/owner/repo/tree/main/src
 *   - short form: owner/repo
 */

import { buildGraph } from './buildGraph'

const VALID_EXTENSIONS = /\.(jsx?|tsx?|mjs|cjs)$/i

const MAX_FILES = 500
const MAX_FILE_BYTES = 200000
const MAX_TOTAL_BYTES = 20000000

const IGNORE_PATTERNS = [
  'node_modules/',
  '.next/',
  'dist/',
  'build/',
  '.cache/',
  '.vercel/',
  '.turbo/',
  'coverage/',
]

export async function parseRepo(input) {
  const { owner, repo } = parseGitHubUrl(input)

  const repoInfo = await gh(`/repos/${owner}/${repo}`)
  const branch = repoInfo.default_branch

  const tree = await gh(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  )

  if (tree.truncated) {
    console.warn(`[parseRepo] tree for ${owner}/${repo} was truncated`)
  }

  const sourceFiles = (tree.tree ?? []).filter(
    (entry) =>
      entry.type === 'blob' &&
      VALID_EXTENSIONS.test(entry.path) &&
      !IGNORE_PATTERNS.some((p) => entry.path.includes(p)) &&
      (entry.size ?? 0) <= MAX_FILE_BYTES
  )

  if (sourceFiles.length === 0) {
    throw new Error('No JavaScript or TypeScript source files found in this repo.')
  }

  if (sourceFiles.length > MAX_FILES) {
    throw new Error(
      `Repo has ${sourceFiles.length} source files — over the ${MAX_FILES} limit for free parsing.`
    )
  }

  const files = {}
  let totalBytes = 0
  const BATCH = 10

  for (let i = 0; i < sourceFiles.length; i += BATCH) {
    const batch = sourceFiles.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (entry) => {
        try {
          const content = await fetchRaw(owner, repo, branch, entry.path)
          return { path: entry.path, content }
        } catch (err) {
          console.warn(`[parseRepo] failed to fetch ${entry.path}:`, err.message)
          return null
        }
      })
    )

    for (const r of results) {
      if (!r) continue
      totalBytes += r.content.length
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new Error('Repo exceeds total size limit for free parsing.')
      }
      files[r.path] = r.content
    }
  }

  const graph = buildGraph(files)

  return {
    ...graph,
    meta: {
      owner,
      repo,
      branch,
      fileCount: Object.keys(files).length,
      truncated: tree.truncated ?? false,
    },
  }
}

export function parseGitHubUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('GitHub URL is required.')
  }

  const trimmed = input.trim().replace(/\.git$/, '')

  const shortMatch = trimmed.match(/^([^\/\s]+)\/([^\/\s]+)$/)
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] }
  }

  try {
    const url = new URL(
      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    )
    if (!/github\.com$/.test(url.hostname)) {
      throw new Error('URL is not a github.com URL.')
    }
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length < 2) {
      throw new Error('URL is missing owner or repo.')
    }
    return { owner: parts[0], repo: parts[1] }
  } catch (err) {
    throw new Error(`Invalid GitHub URL: ${input}`)
  }
}

async function gh(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'orbit-codebase-visualiser',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const res = await fetch(`https://api.github.com${path}`, { headers })

  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      throw new Error('GitHub rate limit hit. Add a GITHUB_TOKEN env var to raise the limit.')
    }
  }

  if (res.status === 404) {
    throw new Error('Repo not found. Is it public?')
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`)
  }

  return res.json()
}

async function fetchRaw(owner, repo, branch, path) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURI(path)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'orbit-codebase-visualiser' },
  })
  if (!res.ok) {
    throw new Error(`fetch ${path} returned ${res.status}`)
  }
  return res.text()
}

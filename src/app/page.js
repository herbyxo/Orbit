'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { parseZipFiles } from '@/lib/parseZip'

export default function Home() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragover, setDragover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  async function handleZip() {
    if (!selectedFile) return
    setLoading(true)
    setError('')
    try {
      const zip = await JSZip.loadAsync(selectedFile)
      const graphData = await parseZipFiles(zip)
      sessionStorage.setItem('orbit-graph', JSON.stringify(graphData))
      router.push('/graph')
    } catch (err) {
      setError('Failed to parse zip file. Make sure it contains a JavaScript/TypeScript project.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUrl() {
    const url = repoUrl.trim()
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/parse-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error('Failed to fetch repo')
      const graphData = await res.json()
      sessionStorage.setItem('orbit-graph', JSON.stringify(graphData))
      router.push('/graph')
    } catch (err) {
      setError('Failed to fetch repo. Make sure the URL is a valid public GitHub repository.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragover(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.zip')) setSelectedFile(file)
  }

  return (
    <div className="orbit-landing-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-10 px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-xl border-b border-[var(--border)]">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(-30 16 16)" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />
            <ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(30 16 16)" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="var(--green-primary)" />
          </svg>
          <span className="font-semibold text-[17px] text-[var(--text-primary)] tracking-tight">Orbit</span>
        </a>
        <a href="https://github.com/herbyxo/Orbit" target="_blank" rel="noopener" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          GitHub ↗
        </a>
      </nav>

      {/* Main */}
      <div className="max-w-[680px] mx-auto px-6 min-h-screen flex flex-col justify-center items-center">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[var(--green-border)] bg-[var(--green-light)] font-mono text-xs font-medium text-[var(--green-primary)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-primary)] animate-pulse-dot" />
            v1.1 — Graph, AI chat, impact mode
          </div>
          <h1 className="font-semibold text-5xl leading-tight text-[var(--text-primary)] mb-3.5 tracking-tighter">
            See your codebase.<br />
            <span className="text-[var(--green-primary)]">Talk to it.</span>
          </h1>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-[460px] mx-auto">
            Paste a GitHub repo or drop a zip file. Orbit maps your code into an interactive graph and lets you explore it with AI.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[520px] mx-auto">
            {[
              { label: 'Live import graph', sub: 'See how files connect' },
              { label: 'BYO-key AI', sub: 'Your key, your data' },
              { label: 'Blast radius', sub: 'Impact mode on any file' },
            ].map((item) => (
              <div
                key={item.label}
                className="px-3 py-2 rounded-lg bg-white/90 border border-[var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-left"
              >
                <div className="text-[12px] font-medium text-[var(--text-primary)]">{item.label}</div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Input section */}
        <div className="w-full animate-fade-up-delay">
          {/* URL input */}
          <div className="relative w-full mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrl()}
              placeholder="https://github.com/user/repo"
              spellCheck="false"
              autoComplete="off"
              className="w-full py-3.5 pl-11 pr-32 bg-white border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-mono text-sm outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)] placeholder:text-[var(--text-tertiary)]"
            />
            <button
              onClick={handleUrl}
              disabled={loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-[var(--green-primary)] text-white rounded-lg text-sm font-medium transition-colors hover:bg-[var(--green-hover)] active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Visualise'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3.5 my-1.5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[13px] text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setDragover(true) }}
            onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
            onDragLeave={(e) => { e.preventDefault(); setDragover(false) }}
            onDrop={onDrop}
            className={`w-full mt-5 py-9 px-6 border-[1.5px] border-dashed rounded-xl text-center cursor-pointer transition-all ${
              dragover
                ? 'border-[var(--green-primary)] bg-[var(--green-light)] shadow-[0_0_0_3px_rgba(16,163,127,0.08)]'
                : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <svg className={`mx-auto mb-2.5 transition-colors ${dragover ? 'text-[var(--green-primary)]' : 'text-[var(--text-tertiary)]'}`} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-[15px] text-[var(--text-secondary)] mb-1">
              Drop a <strong className="text-[var(--green-primary)] font-medium">.zip</strong> file here, or click to browse
            </p>
            <p className="text-[13px] font-mono text-[var(--text-tertiary)]">
              .zip containing a React or Next.js project
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => e.target.files[0] && setSelectedFile(e.target.files[0])}
            />
          </div>

          {/* File info */}
          {selectedFile && (
            <div className="flex items-center gap-3 px-4 py-3 mt-3.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg animate-fade-up">
              <svg className="text-[var(--green-primary)] shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[13px] text-[var(--text-primary)] truncate">{selectedFile.name}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatSize(selectedFile.size)}</div>
              </div>
              <button
                onClick={handleZip}
                disabled={loading}
                className="px-4 py-1.5 bg-[var(--green-primary)] text-white rounded-md text-[13px] font-medium transition-colors hover:bg-[var(--green-hover)] shrink-0 disabled:opacity-50"
              >
                {loading ? 'Parsing...' : 'Visualise'}
              </button>
              <button
                onClick={() => { setSelectedFile(null); fileInputRef.current.value = '' }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors shrink-0 p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 animate-fade-up">
              {error}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex justify-center gap-6 mt-9 animate-fade-up-delay">
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
            Public repos only for v1
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Your code stays in the browser
          </div>
        </div>
      </div>
    </div>
  )
}

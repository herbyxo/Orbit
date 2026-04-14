'use client'

import { useState } from 'react'
import { PROVIDERS } from '@/lib/llmProviders'

/**
 * LLMSettings - inline form for picking provider / model / API key.
 *
 * Props:
 *   initial: { provider, model, apiKey } - existing config, or null
 *   onSave:  (config) => void            - called with new config on Save
 *   onCancel: () => void                 - optional, hides the form (only shown when config already exists)
 *   variant: 'inline' | 'drawer'         - inline is larger (first-run), drawer is compact (edit)
 */
export default function LLMSettings({ initial, onSave, onCancel, variant = 'inline' }) {
  const [provider, setProvider] = useState(initial?.provider ?? 'anthropic')
  const [model, setModel] = useState(
    initial?.model ?? PROVIDERS[initial?.provider ?? 'anthropic'].models[0].id
  )
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)

  const providerDef = PROVIDERS[provider]

  function handleProviderChange(e) {
    const next = e.target.value
    setProvider(next)
    // Reset model to that provider's default
    setModel(PROVIDERS[next].models[0].id)
  }

  function handleSave() {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    onSave({ provider, model, apiKey: trimmed })
  }

  const inline = variant === 'inline'

  return (
    <div
      className={`flex flex-col gap-3 ${
        inline ? 'p-4' : 'p-3.5'
      } bg-white border border-[var(--border)] rounded-lg`}
    >
      {inline && (
        <div className="mb-1">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Connect an AI provider
          </h3>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
            Your key stays in your browser. It&apos;s sent with each chat request to the provider you choose - never stored by Orbit.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Provider
        </label>
        <select
          value={provider}
          onChange={handleProviderChange}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-primary)] bg-white outline-none focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)]"
        >
          {Object.values(PROVIDERS).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-[13px] text-[var(--text-primary)] bg-white outline-none focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)]"
        >
          {providerDef.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide flex items-center justify-between">
          <span>API key</span>
          <a
            href={providerDef.keyConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--green-primary)] hover:underline normal-case tracking-normal font-normal"
          >
            Get key
          </a>
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providerDef.keyPlaceholder}
            spellCheck={false}
            autoComplete="off"
            className="w-full px-3 py-2 pr-16 rounded-lg border border-[var(--border)] text-[13px] font-mono text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_rgba(16,163,127,0.1)]"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors px-1.5"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--green-primary)] text-white text-[13px] font-medium hover:bg-[var(--green-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

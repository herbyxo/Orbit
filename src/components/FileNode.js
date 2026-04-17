'use client'

import { Handle, Position } from '@xyflow/react'

export default function FileNode({ data, selected }) {
  const { isHighlighted, isDimmed, isFocused, isImpactCenter, isAncestor, isDescendant } = data

  // Priority: highlighted (AI) > impactCenter > ancestor > descendant > focused (hover) > selected > default
  const borderClass = isHighlighted
    ? 'border-[var(--green-primary)] shadow-[0_0_0_3px_rgba(16,163,127,0.35)]'
    : isImpactCenter
    ? 'border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.35)]'
    : isAncestor
    ? 'border-red-400 shadow-[0_0_0_2px_rgba(248,113,113,0.3)]'
    : isDescendant
    ? 'border-blue-400 shadow-[0_0_0_2px_rgba(96,165,250,0.3)]'
    : isFocused
    ? 'border-[var(--green-primary)] shadow-[0_0_0_2px_rgba(16,163,127,0.2)]'
    : selected
    ? 'border-[var(--green-primary)] shadow-[0_0_0_2px_rgba(16,163,127,0.15)]'
    : 'border-[var(--border)] hover:border-[var(--border-hover)]'

  const bg = isImpactCenter
    ? 'rgba(255,247,237,1)'
    : isAncestor
    ? 'rgba(255,241,242,1)'
    : isDescendant
    ? 'rgba(239,246,255,1)'
    : 'white'

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border text-left min-w-[120px] max-w-[200px]
        transition-all duration-200 cursor-pointer
        ${borderClass}
      `}
      style={{
        background: bg,
        opacity: isDimmed ? 0.2 : 1,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--border)] !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
          {data.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-0.5">
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono truncate">
          {data.fileType}
        </div>
        {data.loc > 0 && (
          <div className="text-[10px] text-[var(--text-tertiary)] font-mono ml-1 shrink-0">
            {data.loc}L
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--border)] !w-2 !h-2 !border-0" />
    </div>
  )
}

'use client'

import { Handle, Position } from '@xyflow/react'

/**
 * LOC-based size tier for visual complexity signals.
 * sm < 80 lines, md 80-200, lg > 200
 */
function getSizeTier(loc) {
  if (loc > 200) return 'lg'
  if (loc > 80) return 'md'
  return 'sm'
}

const SIZE_CLASSES = {
  sm: 'min-w-[110px] max-w-[190px] px-3 py-2',
  md: 'min-w-[140px] max-w-[215px] px-3.5 py-2.5',
  lg: 'min-w-[165px] max-w-[240px] px-4 py-3',
}

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

  const sizeTier = getSizeTier(data.loc ?? 0)
  const sizeClass = SIZE_CLASSES[sizeTier]

  return (
    <div
      className={`
        ${sizeClass} rounded-lg border text-left
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
        <span
          className={`font-medium text-[var(--text-primary)] truncate ${
            sizeTier === 'lg' ? 'text-[13px]' : 'text-[12px]'
          }`}
        >
          {data.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-0.5">
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono truncate">
          {data.fileType}
        </div>
        {data.loc > 0 && (
          <div
            className={`text-[10px] font-mono ml-1 shrink-0 ${
              sizeTier === 'lg'
                ? 'text-[var(--green-primary)] font-semibold'
                : 'text-[var(--text-tertiary)]'
            }`}
          >
            {data.loc}L
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--border)] !w-2 !h-2 !border-0" />
    </div>
  )
}

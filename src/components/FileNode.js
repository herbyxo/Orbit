'use client'

import { Handle, Position } from '@xyflow/react'

export default function FileNode({ data, selected }) {
  return (
    <div
      className={`
        px-3 py-2 rounded-lg border text-left min-w-[120px] max-w-[200px]
        transition-all cursor-pointer
        ${selected
          ? 'border-[var(--green-primary)] shadow-[0_0_0_2px_rgba(16,163,127,0.15)]'
          : 'border-[var(--border)] hover:border-[var(--border-hover)]'
        }
      `}
      style={{ background: 'white' }}
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

      <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5 font-mono truncate">
        {data.fileType}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--border)] !w-2 !h-2 !border-0" />
    </div>
  )
}

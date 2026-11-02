import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string
  currentSortKey: string
  currentDirection: SortDirection
  onSort: (columnKey: string) => void
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
}

export function SortableTableHead({
  columnKey,
  currentSortKey,
  currentDirection,
  onSort,
  children,
  className,
  align = 'left',
  ...props
}: SortableTableHeadProps) {
  const isActive = currentSortKey === columnKey

  const alignmentClass =
    align === 'center'
      ? 'justify-center text-center'
      : align === 'right'
        ? 'justify-end text-right'
        : 'justify-start text-left'

  return (
    <th
      className={cn(
        'p-2 align-middle font-bold text-slate-800 dark:text-slate-200 transition-colors select-none cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/80 group',
        isActive && 'bg-sky-50/70 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200',
        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
      onClick={() => onSort(columnKey)}
      title={`Clique para ordenar por ${typeof children === 'string' ? children : 'esta coluna'}`}
      {...props}
    >
      <div className={cn('flex items-center gap-1.5', alignmentClass)}>
        <span className="truncate">{children}</span>
        <span className="shrink-0 transition-opacity">
          {isActive ? (
            currentDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 font-bold" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 font-bold" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  )
}

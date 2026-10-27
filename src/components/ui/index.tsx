import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

/** 应用外壳用的基础组件。注意这些只负责工具界面，不参与文章排版。 */

type ButtonVariant = 'primary' | 'default' | 'ghost'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900',
  default:
    'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700',
  ghost:
    'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/70',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  active?: boolean
}

export function Button({
  variant = 'default',
  active = false,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASS[variant],
        active ? 'bg-slate-200 dark:bg-slate-700' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}

/** 工具栏里的紧凑图标/文字按钮 */
export function ToolButton({
  title,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { title: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded px-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
      {...rest}
    >
      {children}
    </button>
  )
}

export function Divider() {
  return <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600" />
}

export interface PopoverProps {
  label: ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  panelClassName?: string
}

/** 点击展开的浮层。点击外部或按 Esc 关闭。 */
export function Popover({
  label,
  children,
  align = 'left',
  panelClassName = '',
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <Button onClick={() => setOpen((value) => !value)} active={open}>
        {label}
        <span className="text-[10px] opacity-60">▾</span>
      </Button>
      {open && (
        <div
          className={[
            'absolute z-30 mt-1.5 min-w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg',
            'dark:border-slate-700 dark:bg-slate-800',
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          ].join(' ')}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export interface MenuItemProps {
  onClick: () => void
  active?: boolean
  title: string
  description?: string
}

export function MenuItem({ onClick, active, title, description }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      <span className="text-sm font-medium">{title}</span>
      {description && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
      )}
    </button>
  )
}

export interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-md py-1.5 text-left"
    >
      <span className="flex flex-col">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </span>
      <span
        className={[
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
            checked ? 'left-[18px]' : 'left-[2px]',
          ].join(' ')}
        />
      </span>
    </button>
  )
}

const INPUT_CLASS =
  'h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800 ' +
  'outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${INPUT_CLASS} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${INPUT_CLASS} cursor-pointer ${props.className ?? ''}`} />
  )
}

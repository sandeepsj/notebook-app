// Monochrome line icons (stroke = currentColor) used across the editor.

import type { ReactNode, SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const PenIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </Icon>
)

export const PencilIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    <path d="m14.5 5.5 3 3" />
  </Icon>
)

export const HighlighterIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 11-6 6v3h3l6-6" />
    <path d="M14 6 9 11l4 4 5-5z" />
    <path d="m14 6 4-4 4 4-4 4z" />
  </Icon>
)

export const EraserIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m7 21-4.3-4.3a1.94 1.94 0 0 1 0-2.74l8.5-8.5a1.94 1.94 0 0 1 2.74 0l5.6 5.6a1.94 1.94 0 0 1 0 2.74L13.5 21z" />
    <path d="M22 21H8" />
    <path d="m5.5 12.5 6 6" />
  </Icon>
)

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
)

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H8" />
  </Icon>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icon>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M12 5v14" />
  </Icon>
)

export const TextIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </Icon>
)

export const SketchIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 16c2-5 4-5 6 0s4 5 6 0 4-5 6 0" />
    <path d="M3 20h18" />
  </Icon>
)

export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m18 15-6-6-6 6" />
  </Icon>
)

export const ArrowDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
)

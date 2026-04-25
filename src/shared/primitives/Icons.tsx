import type { CSSProperties } from 'react';

interface IconProps {
  s?: number;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

interface ChevronProps extends IconProps {
  dir?: 'down' | 'up' | 'left' | 'right';
}

const baseStroke = (s = 14): IconProps & { width: number; height: number; viewBox: string } => ({
  s,
  width: s,
  height: s,
  viewBox: '0 0 16 16',
});

export const Ic = {
  Play: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M4.5 3.2v9.6c0 .4.4.6.7.4l7.5-4.8a.5.5 0 0 0 0-.8L5.2 2.8a.5.5 0 0 0-.7.4Z" />
    </svg>
  ),
  Pause: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...rest}>
      <rect x="4" y="3" width="3" height="10" rx="1" />
      <rect x="9" y="3" width="3" height="10" rx="1" />
    </svg>
  ),
  Brain: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d="M7.5 3.5c-1 -0.8 -2.8 -0.4 -3 1 -1.2 0.2 -1.5 1.6 -0.7 2.3 -0.8 0.8 -0.4 2.2 0.7 2.4 0 1.3 1.5 2 2.6 1.2l0.4 -0.3V3.5Z" />
      <path d="M8.5 3.5c1-0.8 2.8-0.4 3 1 1.2 0.2 1.5 1.6 0.7 2.3 0.8 0.8 0.4 2.2-0.7 2.4 0 1.3-1.5 2-2.6 1.2L8.5 10.1V3.5Z" />
    </svg>
  ),
  Timer: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <circle cx="8" cy="9" r="5.2" />
      <path d="M8 6V9L10 10.5" />
      <path d="M6 2h4M8 2v1.5" />
    </svg>
  ),
  Plus: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" {...rest}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  ),
  Search: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true" {...rest}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10 10l3 3" />
    </svg>
  ),
  Chevron: ({ s = 14, dir = 'down', ...rest }: ChevronProps) => {
    const rot = { down: 0, up: 180, left: 90, right: -90 }[dir];
    return (
      <svg
        width={s}
        height={s}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `rotate(${rot}deg)`, ...rest.style }}
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    );
  },
  Close: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" {...rest}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  More: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...rest}>
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  ),
  Drag: ({ s = 12, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" {...rest}>
      <circle cx="4" cy="3" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="9" r="1" />
      <circle cx="8" cy="3" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="8" cy="9" r="1" />
    </svg>
  ),
  Calendar: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true" {...rest}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
    </svg>
  ),
  Check: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d="M3 8l3.5 3.5L13 5" />
    </svg>
  ),
  Bolt: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M9 1 3 9h4l-1 6 6-8H8l1-6Z" />
    </svg>
  ),
  Settings: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" {...rest}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M3.8 12.2l1-1M11.2 4.8l1-1" />
    </svg>
  ),
  Download: ({ s = 14, ...rest }: IconProps) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d="M8 2v8M4.5 7L8 10.5 11.5 7M3 13h10" />
    </svg>
  ),
};

// keep the helper for any future icons that need consistent base props
void baseStroke;

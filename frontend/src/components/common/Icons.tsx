// Small inline SVG icons; currentColor so they follow the theme.

interface IconProps {
  size?: number;
}

export function IconPrev({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="2.6" height="14" rx="1" fill="currentColor" />
      <path d="M19 5.8v12.4a.8.8 0 0 1-1.25.66L9.4 12.66a.8.8 0 0 1 0-1.32l8.35-6.2A.8.8 0 0 1 19 5.8Z" fill="currentColor" />
    </svg>
  );
}

export function IconNext({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="16.4" y="5" width="2.6" height="14" rx="1" fill="currentColor" />
      <path d="M5 5.8v12.4a.8.8 0 0 0 1.25.66l8.35-6.2a.8.8 0 0 0 0-1.32l-8.35-6.2A.8.8 0 0 0 5 5.8Z" fill="currentColor" />
    </svg>
  );
}

export function IconPlay({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.9v14.2a.9.9 0 0 0 1.37.77l11.3-7.1a.9.9 0 0 0 0-1.54L8.37 4.13A.9.9 0 0 0 7 4.9Z" fill="currentColor" />
    </svg>
  );
}

export function IconPause({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function IconStop({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export function IconGear({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function IconGrip({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {[3, 8, 13].map((y) => (
        <g key={y}>
          <circle cx="5.5" cy={y} r="1.3" fill="currentColor" />
          <circle cx="10.5" cy={y} r="1.3" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

export function IconChevron({ size = 14, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 150ms' }}>
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

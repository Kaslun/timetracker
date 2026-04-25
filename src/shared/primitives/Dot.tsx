interface DotProps {
  running: boolean;
}

export function Dot({ running }: DotProps) {
  return <span className={running ? 'live-dot' : 'idle-dot'} />;
}

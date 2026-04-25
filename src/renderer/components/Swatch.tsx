interface SwatchProps {
  color: string;
  size?: number;
}

export function Swatch({ color, size = 10 }: SwatchProps) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        background: color,
        display: "inline-block",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
      }}
    />
  );
}

import { PAL, SPRITES } from "@/lib/sprites";

export function PixelSprite({ name, size = 64, dim = false, title }: { name: string; size?: number; dim?: boolean; title?: string }) {
  const map = SPRITES[name] ?? SPRITES.clasica;
  const rects: React.ReactNode[] = [];
  map.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch && ch !== "." && PAL[ch]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={dim ? "#3A3450" : PAL[ch]} />);
    }
  });
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  );
}

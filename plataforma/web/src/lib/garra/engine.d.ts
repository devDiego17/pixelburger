export type GarraState = "idle" | "moving" | "gripping" | "carrying" | "busy";
export type GarraResult = {
  prize: string | null;
  outcome: "win" | "slip" | "miss" | "drop" | "bounce";
  tip: string;
  tapErrorMs: number | null;
  durationMs: number;
};
export type GarraController = {
  startTurn(seed?: number): boolean;
  setDir(d: -1 | 0 | 1): void;
  action(): void;
  setSound(on: boolean): void;
  state(): GarraState;
  destroy(): void;
};
export function createGarra(
  canvas: HTMLCanvasElement,
  opts?: { onState?: (s: GarraState) => void; onTimer?: (s: number) => void; onResult?: (r: GarraResult) => void; sound?: boolean },
): GarraController;

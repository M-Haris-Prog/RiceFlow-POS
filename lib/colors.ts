const PALETTE = ["#f59e0b", "#4ade80", "#38bdf8", "#c084fc", "#fb7185", "#2dd4bf"];

export function accentColorFor(index: number) {
  return PALETTE[index % PALETTE.length];
}

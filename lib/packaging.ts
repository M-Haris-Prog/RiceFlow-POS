// Rice is stocked and sold either in sealed bags or loose ("open").
export const PACKAGING_VALUES = ["BAG", "OPEN"] as const;
export type Packaging = (typeof PACKAGING_VALUES)[number];

export const PACKAGING_OPTIONS: { value: Packaging; label: string }[] = [
  { value: "BAG", label: "Bag" },
  { value: "OPEN", label: "Open" },
];

export function packagingLabel(p: string) {
  return PACKAGING_OPTIONS.find((o) => o.value === p)?.label ?? p;
}

export type ContractSearchTarget =
  | { kind: "order"; id: number }
  | { kind: "contract"; id: number };

export function resolveContractSearch(value?: string): ContractSearchTarget | null {
  const match = value?.trim().toUpperCase().match(/^(ORD|CNT)-0*(\d+)$/);
  if (!match) return null;

  const id = Number(match[2]);
  if (!Number.isSafeInteger(id) || id < 1) return null;

  return { kind: match[1] === "ORD" ? "order" : "contract", id };
}

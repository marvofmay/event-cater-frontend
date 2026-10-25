"use client";
import { useUser } from "@/app/context/userContext";
import { Lookup, LookupItem } from "./Lookup";

export function PreparationLookup({
  label,
  value,
  onChange,
  equipment = true,
  consumables = true,
}: {
  label: string;
  value: LookupItem | null;
  onChange: (value: LookupItem | null) => void;
  equipment?: boolean;
  consumables?: boolean;
}) {
  const { hasPermission } = useUser();
  const canUseEquipment = equipment && hasPermission("equipment.list");
  const canUseConsumables = consumables && hasPermission("consumables.list");
  const kind = canUseEquipment && canUseConsumables
    ? "all"
    : canUseEquipment ? "equipment" : "consumable";

  return (
    <Lookup
      key={kind}
      label={label}
      path={"/preparation-options?kind=" + kind}
      value={value}
      onChange={onChange}
      disabled={!canUseEquipment && !canUseConsumables}
    />
  );
}

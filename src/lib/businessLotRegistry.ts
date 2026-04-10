import { PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS } from "../config/gameplay";
import { getLocalStarterBusinessKey } from "./localStarterBusinesses";
import type { LocalMissionSubjectState } from "./missionHarness";
import type {
  BusinessDistrictCapacitySummary,
  BusinessLotOccupancyStatus,
  BusinessLotRegistryEntry,
  BusinessNftClassId,
  BusinessPlacementVariantDefinition,
  BusinessTypeId,
  LocalBusinessLotOption,
} from "../types/business";
import type { NerdieCityDistrict } from "../config/gameplay";

function formatValue(value: string): string {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getLotLabel(
  district: NerdieCityDistrict,
  territorySubtype: string,
  index: number
): string {
  return `${formatValue(district)} ${formatValue(territorySubtype)} Lot ${String(index + 1).padStart(2, "0")}`;
}

function getLotOccupancyStatus(
  lotId: string,
  missionState: LocalMissionSubjectState
): {
  occupancyStatus: BusinessLotOccupancyStatus;
  occupantBusinessKey: string | null;
} {
  const openedBusiness = missionState.openedStarterBusinesses.find(
    (business) => business.lotId === lotId
  );

  if (!openedBusiness) {
    return {
      occupancyStatus: "unassigned",
      occupantBusinessKey: null,
    };
  }

  return {
    occupancyStatus: "occupied",
    occupantBusinessKey: getLocalStarterBusinessKey(openedBusiness),
  };
}

function toLocalBusinessLotOption(
  entry: BusinessLotRegistryEntry
): LocalBusinessLotOption {
  return {
    id: entry.id,
    label: entry.label,
    lotTags: entry.lotTags,
    size: entry.lotSize,
    occupancyStatus: entry.occupancyStatus,
    occupancyLabel:
      entry.occupancyStatus === "occupied" ? "Occupied" : "Available",
    placementVariantId: entry.placementVariantId,
  };
}

export function getStarterBusinessPlacementVariants(): BusinessPlacementVariantDefinition[] {
  return PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS;
}

export function getStarterBusinessPlacementVariant(
  businessTypeId: BusinessTypeId,
  businessNftClassId: BusinessNftClassId
): BusinessPlacementVariantDefinition | null {
  return (
    PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS.find(
      (variant) =>
        variant.businessTypeId === businessTypeId &&
        variant.businessNftClassId === businessNftClassId
    ) ?? null
  );
}

export function buildLocalBusinessLotRegistry(
  missionState: LocalMissionSubjectState
): BusinessLotRegistryEntry[] {
  return PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS.flatMap((variant) =>
    Object.entries(variant.districtLotCounts).flatMap(([district, count]) =>
      Array.from({ length: count ?? 0 }, (_, index) => {
        const territorySubtype =
          variant.territorySubtypes[index % variant.territorySubtypes.length] ??
          "service_row";
        const id = `${variant.id}:${district}:${index + 1}`;
        const occupancy = getLotOccupancyStatus(id, missionState);

        return {
          id,
          label: getLotLabel(district as NerdieCityDistrict, territorySubtype, index),
          district: district as NerdieCityDistrict,
          territorySubtype,
          lotSize: variant.lotSize,
          lotTags: variant.lotTags,
          placementVariantId: variant.id,
          businessTypeId: variant.businessTypeId,
          businessNftClassId: variant.businessNftClassId,
          occupancyStatus: occupancy.occupancyStatus,
          occupantBusinessKey: occupancy.occupantBusinessKey,
        } satisfies BusinessLotRegistryEntry;
      })
    )
  );
}

export function buildLocalBusinessLotOptions(
  missionState: LocalMissionSubjectState,
  businessTypeId: BusinessTypeId,
  businessNftClassId: BusinessNftClassId,
  district: NerdieCityDistrict
): LocalBusinessLotOption[] {
  const placementVariant = getStarterBusinessPlacementVariant(
    businessTypeId,
    businessNftClassId
  );

  if (!placementVariant) {
    return [];
  }

  return buildLocalBusinessLotRegistry(missionState)
    .filter(
      (entry) =>
        entry.businessTypeId === businessTypeId &&
        entry.businessNftClassId === businessNftClassId &&
        entry.district === district
    )
    .map(toLocalBusinessLotOption);
}

export function getBusinessLotRegistryEntry(
  missionState: LocalMissionSubjectState,
  lotId: string
): BusinessLotRegistryEntry | null {
  return buildLocalBusinessLotRegistry(missionState).find((entry) => entry.id === lotId) ?? null;
}

export function buildBusinessDistrictCapacitySummaries(
  missionState: LocalMissionSubjectState
): BusinessDistrictCapacitySummary[] {
  const registry = buildLocalBusinessLotRegistry(missionState);
  const districts: NerdieCityDistrict[] = ["neon_market", "dark_alley", "cyber_hq"];

  return districts.map((district) => {
    const districtEntries = registry.filter((entry) => entry.district === district);
    const byPlacementVariant = Array.from(
      new Map(
        districtEntries.map((entry) => {
          const variantEntries = districtEntries.filter(
            (candidate) => candidate.placementVariantId === entry.placementVariantId
          );

          return [
            entry.placementVariantId,
            {
              placementVariantId: entry.placementVariantId,
              label: PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS.find(
                (variant) => variant.id === entry.placementVariantId
              )?.label ?? entry.placementVariantId,
              totalLots: variantEntries.length,
              availableLots: variantEntries.filter(
                (candidate) => candidate.occupancyStatus === "unassigned"
              ).length,
              occupiedLots: variantEntries.filter(
                (candidate) => candidate.occupancyStatus === "occupied"
              ).length,
            },
          ];
        })
      ).values()
    );

    return {
      district,
      totalLots: districtEntries.length,
      availableLots: districtEntries.filter((entry) => entry.occupancyStatus === "unassigned")
        .length,
      occupiedLots: districtEntries.filter((entry) => entry.occupancyStatus === "occupied")
        .length,
      starterBusinessLots: districtEntries.length,
      byPlacementVariant,
    };
  });
}

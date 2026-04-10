import type { BusinessPlacementVariantDefinition } from "../../types/business";

export const PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS: BusinessPlacementVariantDefinition[] = [
  {
    id: "retail_business:street_market_shop",
    label: "Street Market Shop",
    businessTypeId: "market_shop",
    businessNftClassId: "retail_business",
    totalAllocation: 70,
    preferredDistricts: ["neon_market"],
    allowedDistricts: ["neon_market", "cyber_hq"],
    territorySubtypes: ["market_strip", "plaza_edge", "service_row"],
    lotTags: ["retail_frontage", "market_kiosk", "high_traffic", "commercial_corner"],
    lotSize: "small",
    districtLotCounts: {
      neon_market: 50,
      cyber_hq: 20,
    },
  },
  {
    id: "entertainment_venue:pop_up_venue_shop",
    label: "Pop-Up Venue Shop",
    businessTypeId: "market_shop",
    businessNftClassId: "entertainment_venue",
    totalAllocation: 45,
    preferredDistricts: ["neon_market", "dark_alley"],
    allowedDistricts: ["neon_market", "dark_alley"],
    territorySubtypes: ["club_row", "market_strip", "back_alley"],
    lotTags: ["venue_social", "market_kiosk", "high_traffic", "low_profile"],
    lotSize: "small",
    districtLotCounts: {
      neon_market: 28,
      dark_alley: 17,
    },
  },
  {
    id: "tech_startup:dev_garage",
    label: "Dev Garage",
    businessTypeId: "garage",
    businessNftClassId: "tech_startup",
    totalAllocation: 20,
    preferredDistricts: ["cyber_hq", "neon_market"],
    allowedDistricts: ["cyber_hq", "neon_market"],
    territorySubtypes: ["technical_corridor", "service_row", "industrial_lane"],
    lotTags: ["workshop_service", "office_technical", "industrial"],
    lotSize: "medium",
    districtLotCounts: {
      cyber_hq: 14,
      neon_market: 6,
    },
  },
  {
    id: "manufacturing_unit:service_garage",
    label: "Service Garage",
    businessTypeId: "garage",
    businessNftClassId: "manufacturing_unit",
    totalAllocation: 40,
    preferredDistricts: ["cyber_hq", "neon_market"],
    allowedDistricts: ["cyber_hq", "neon_market"],
    territorySubtypes: ["industrial_lane", "service_row"],
    lotTags: ["workshop_service", "industrial_production", "team_required"],
    lotSize: "medium",
    districtLotCounts: {
      cyber_hq: 26,
      neon_market: 14,
    },
  },
  {
    id: "tech_startup:data_hub",
    label: "Data Hub",
    businessTypeId: "data_hub",
    businessNftClassId: "tech_startup",
    totalAllocation: 20,
    preferredDistricts: ["cyber_hq", "neon_market"],
    allowedDistricts: ["cyber_hq", "neon_market"],
    territorySubtypes: ["technical_corridor", "office_block"],
    lotTags: ["office_technical", "office_secure", "intel_node"],
    lotSize: "medium",
    districtLotCounts: {
      cyber_hq: 16,
      neon_market: 4,
    },
  },
  {
    id: "financial_institution:intel_finance_node",
    label: "Intel Finance Node",
    businessTypeId: "data_hub",
    businessNftClassId: "financial_institution",
    totalAllocation: 16,
    preferredDistricts: ["cyber_hq"],
    allowedDistricts: ["cyber_hq"],
    territorySubtypes: ["office_block", "secure_compound"],
    lotTags: ["financial_secure", "office_secure", "intel_node"],
    lotSize: "medium",
    districtLotCounts: {
      cyber_hq: 16,
    },
  },
  {
    id: "financial_institution:black_market_stall",
    label: "Black Market Stall",
    businessTypeId: "black_market_stall",
    businessNftClassId: "financial_institution",
    totalAllocation: 16,
    preferredDistricts: ["dark_alley"],
    allowedDistricts: ["dark_alley"],
    territorySubtypes: ["back_alley", "underground_node"],
    lotTags: ["underground_stall", "low_profile", "covert_access"],
    lotSize: "small",
    districtLotCounts: {
      dark_alley: 16,
    },
  },
];

for (const variant of PHASE2A_STARTER_BUSINESS_PLACEMENT_VARIANTS) {
  const totalLots = Object.values(variant.districtLotCounts).reduce(
    (sum, count) => sum + (count ?? 0),
    0
  );

  if (totalLots !== variant.totalAllocation) {
    throw new Error(
      `Invalid lot distribution for ${variant.id}: expected ${variant.totalAllocation}, received ${totalLots}.`
    );
  }
}

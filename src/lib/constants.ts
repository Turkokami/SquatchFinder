export const leadCategoryOptions = [
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "APARTMENTS", label: "Apartments" },
  { value: "MULTIFAMILY", label: "Multifamily housing" },
  { value: "HOA", label: "HOAs" },
  { value: "RETIREMENT", label: "Retirement communities" },
  { value: "FOOD_MANUFACTURER", label: "Food manufacturers" },
  { value: "COMMERCIAL_KITCHEN", label: "Commercial kitchens" },
  { value: "BREWERY", label: "Breweries" },
  { value: "GROCERY", label: "Grocery stores" },
  { value: "PROPERTY_MANAGEMENT", label: "Property management" },
] as const;

export const pipelineStages = [
  { value: "NEW", label: "New" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "SITE_SURVEY", label: "Site survey" },
  { value: "PROPOSAL_SENT", label: "Proposal sent" },
  { value: "NEGOTIATING", label: "Negotiating" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const;

export const outreachTypeOptions = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "TEXT", label: "Text" },
  { value: "VISIT", label: "Visit" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "FACEBOOK", label: "Facebook" },
] as const;

export const priorityCategoryWeights: Record<string, number> = {
  RESTAURANT: 20,
  APARTMENTS: 18,
  MULTIFAMILY: 18,
  HOA: 14,
  RETIREMENT: 19,
  FOOD_MANUFACTURER: 22,
  COMMERCIAL_KITCHEN: 21,
  BREWERY: 16,
  GROCERY: 20,
  PROPERTY_MANAGEMENT: 17,
};

export const mapPrimaryCategoryOptions = [
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "APARTMENTS", label: "Apartments" },
  { value: "MULTIFAMILY", label: "Multifamily housing" },
  { value: "HOA", label: "HOAs" },
  { value: "RETIREMENT", label: "Retirement communities" },
  { value: "FOOD_MANUFACTURER", label: "Food manufacturing" },
  { value: "COMMERCIAL_KITCHEN", label: "Commercial kitchens" },
  { value: "BREWERY", label: "Breweries" },
  { value: "GROCERY", label: "Grocery stores" },
  { value: "PROPERTY_MANAGEMENT", label: "Property managers" },
] as const;

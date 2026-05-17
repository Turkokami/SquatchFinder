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
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "RESEARCHING", label: "Researching" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "FOLLOW_UP_SCHEDULED", label: "Follow-Up Scheduled" },
  { value: "INSPECTION_SCHEDULED", label: "Inspection Scheduled" },
  { value: "PROPOSAL_SENT", label: "Proposal Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "NURTURE", label: "Nurture" },
] as const;

export const outreachTypeOptions = [
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
  { value: "IN_PERSON_VISIT", label: "In-person visit" },
  { value: "VOICEMAIL", label: "Voicemail" },
  { value: "TEXT_MESSAGE", label: "Text message" },
  { value: "PROPOSAL_SENT", label: "Proposal sent" },
  { value: "FOLLOW_UP_REMINDER", label: "Follow-up reminder" },
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

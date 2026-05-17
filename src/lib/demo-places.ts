type DemoPlace = {
  businessName: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  addressLine1: string;
  description: string;
  employeeCount?: number;
  unitCount?: number;
};

const demoPlaces: DemoPlace[] = [
  {
    businessName: "Pine Street Family Kitchen",
    category: "RESTAURANT",
    city: "Denver",
    state: "CO",
    phone: "(303) 555-0154",
    website: "https://pinestreetkitchen.example.com",
    addressLine1: "120 Pine Street",
    description: "Independent restaurant with late-night kitchen and patio dining.",
    employeeCount: 32,
  },
  {
    businessName: "Redwood Heights Apartments",
    category: "APARTMENTS",
    city: "Phoenix",
    state: "AZ",
    phone: "(602) 555-0199",
    website: "https://redwoodheights.example.com",
    addressLine1: "4401 East Mesa View",
    description: "212-unit apartment community with clubhouse and shared laundry rooms.",
    unitCount: 212,
  },
  {
    businessName: "Golden Barrel Brewing Co.",
    category: "BREWERY",
    city: "Portland",
    state: "OR",
    phone: "(503) 555-0108",
    website: "https://goldenbarrel.example.com",
    addressLine1: "85 Alder Avenue",
    description: "Production brewery with taproom, grain storage, and food service.",
    employeeCount: 28,
  },
  {
    businessName: "Oak Crest HOA",
    category: "HOA",
    city: "Dallas",
    state: "TX",
    phone: "(214) 555-0148",
    website: "https://oakcresthoa.example.com",
    addressLine1: "910 Creekside Drive",
    description: "HOA managing common areas, pool house, mail room, and perimeter landscaping.",
  },
  {
    businessName: "Evergreen Senior Living",
    category: "RETIREMENT",
    city: "Boise",
    state: "ID",
    phone: "(208) 555-0136",
    website: "https://evergreensenior.example.com",
    addressLine1: "77 Willow Lane",
    description: "Retirement campus with dining hall, memory care wing, and garden courtyards.",
    employeeCount: 67,
  },
  {
    businessName: "Summit Property Management Group",
    category: "PROPERTY_MANAGEMENT",
    city: "Charlotte",
    state: "NC",
    phone: "(704) 555-0163",
    website: "https://summitpm.example.com",
    addressLine1: "830 Trade Street",
    description: "Regional property manager overseeing multifamily and mixed-use communities.",
    employeeCount: 55,
  },
];

export function searchDemoPlaces(query: string, category?: string, state?: string) {
  return demoPlaces.filter((place) => {
    const matchesQuery =
      !query ||
      `${place.businessName} ${place.description} ${place.city} ${place.state}`
        .toLowerCase()
        .includes(query.toLowerCase());

    const matchesCategory = !category || place.category === category;
    const matchesState = !state || place.state.toLowerCase() === state.toLowerCase();

    return matchesQuery && matchesCategory && matchesState;
  });
}

/* Navigation structure + page titles (the prototype's NAV table and `P[route].title`). */

export const NAV: { group: string; items: { id: string; label: string; icon: string }[] }[] = [
  {
    group: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      { id: "map", label: "Fleet map", icon: "map" },
      { id: "controls", label: "Vehicle controls", icon: "power" },
      { id: "recovery", label: "Recovery", icon: "pin" },
    ],
  },
  {
    group: "Riders",
    items: [
      { id: "onboarding", label: "Rider onboarding", icon: "userCheck" },
      { id: "riders", label: "Riders", icon: "users" },
    ],
  },
  {
    group: "Fleet",
    items: [
      { id: "vehicles", label: "Vehicles", icon: "scooter" },
      { id: "assignment", label: "Vehicle assignment", icon: "link" },
      { id: "replacement", label: "Vehicle replacement", icon: "swap" },
    ],
  },
  {
    group: "Finance",
    items: [
      { id: "finance", label: "Financial history", icon: "receipt" },
      { id: "expenses", label: "Expenses", icon: "wallet" },
    ],
  },
  { group: "System", items: [{ id: "settings", label: "Settings", icon: "settings" }] },
];

export const PAGE_TITLES: Record<string, string> = {
  dashboard: "Fleet dashboard",
  map: "Fleet map",
  onboarding: "Rider onboarding",
  riders: "Riders",
  vehicles: "Vehicles",
  assignment: "Vehicle assignment",
  replacement: "Vehicle replacement",
  finance: "Financial history",
  expenses: "Expenses",
  recovery: "Recovery",
  controls: "Vehicle controls",
  settings: "Settings",
};

export const titleFor = (route: string) => PAGE_TITLES[route] || PAGE_TITLES.dashboard;

/** The Rider App prototype is a separate project; point at wherever it is served. */
export const RIDER_APP_URL = process.env.NEXT_PUBLIC_RIDER_APP_URL || "http://localhost:5173/rider.html";

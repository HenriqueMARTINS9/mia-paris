import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MIA PARIS CRM",
    short_name: "MIA CRM",
    description:
      "Pilotage quotidien MIA PARIS pour emails entrants, demandes, tâches, deadlines et productions.",
    start_url: "/aujourdhui",
    display: "standalone",
    background_color: "#fcfaf6",
    theme_color: "#17212b",
    lang: "fr-FR",
    orientation: "portrait",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/pwa-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

// Case study artwork lives in /public/assets/case-studies. Each file is one intact supplied SVG.
export type CaseStudy = {
  slug: string;
  title: string;
  artwork: { url: string; width: number; height: number; label?: string }[];
};

/**
 * The listing artwork carries one `.card` group per case study, in the same order as `caseStudies`
 * (left to right, top to bottom). It brings its own hover styling.
 */
export const caseStudyListing = { url: "/assets/case-studies/index.svg", width: 1440, height: 1630 };

export const caseStudies: CaseStudy[] = [
  {
    slug: "automation-platform",
    title: "Rethinking Automation",
    artwork: [
      { url: "/assets/case-studies/client-x-light.svg", width: 1440, height: 11200, label: "Light" },
      { url: "/assets/case-studies/client-x-dark.svg", width: 1440, height: 11200, label: "Dark" },
    ],
  },
  {
    slug: "time-tracking",
    title: "Time Tracking Simplified",
    artwork: [{ url: "/assets/case-studies/hrms.svg", width: 1440, height: 6603 }],
  },
  {
    slug: "textile-workflows",
    title: "Digitising Textiles Workflows",
    artwork: [{ url: "/assets/case-studies/resha.svg", width: 1440, height: 8987 }],
  },
  {
    slug: "parenthood-communities",
    title: "Connecting Parenthood Communities",
    artwork: [{ url: "/assets/case-studies/nuzzle.svg", width: 1440, height: 10729 }],
  },
];

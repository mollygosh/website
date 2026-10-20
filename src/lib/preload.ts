import { aboutPageAsset, collageAsset, playHeadingsAsset } from "@/lib/assets";
import { caseStudies, caseStudyListing } from "@/lib/case-studies";

const decoded = new Map<string, Promise<void>>();

/** Fetches and decodes an image once, so a page that uses it paints complete on its first frame. */
export const decodeImage = (url: string) => {
  let pending = decoded.get(url);
  if (!pending) {
    const image = new Image();
    image.src = url;
    pending = image.decode().catch(() => {});
    decoded.set(url, pending);
  }
  return pending;
};

export const preloadCaseStudy = (slug: string) => {
  const study = caseStudies.find((item) => item.slug === slug);
  const phone = window.matchMedia("(max-width: 760px)").matches;
  return Promise.all((study?.artwork ?? []).map((item) => decodeImage(phone && item.mobileUrl ? item.mobileUrl : item.url)));
};

/** What a destination needs on screen before its transition should start. */
export const preparePage = (destination: string, slug?: string) => {
  switch (destination) {
    case "work":
      return decodeImage(caseStudyListing.url);
    case "about":
      return decodeImage(aboutPageAsset.url);
    case "play":
      return Promise.all([decodeImage(playHeadingsAsset.url), decodeImage(collageAsset.url)]);
    case "case":
      return slug ? preloadCaseStudy(slug) : Promise.resolve();
    default:
      return Promise.resolve();
  }
};

/** Warm the small pages while the browser is idle. Case studies are large and load when a card is approached. */
export const preloadSiteArtwork = () => {
  for (const destination of ["work", "about", "play"]) void preparePage(destination);
};

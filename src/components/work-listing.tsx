import { useEffect, useRef, useState } from "react";

import { caseStudies, caseStudyListing } from "@/lib/case-studies";
import { preloadCaseStudy } from "@/lib/preload";

let listingMarkup: Promise<string> | null = null;

const loadListing = () => (listingMarkup ??= fetch(caseStudyListing.url).then((response) => response.text()));

// The listing is inlined in two places (the home scroll and the Work page), so every id is made unique per instance.
const scopeIds = (markup: string, instance: string) => {
  let scoped = markup;
  for (const [, id] of markup.matchAll(/\bid="([^"]+)"/g)) {
    scoped = scoped
      .replaceAll(`id="${id}"`, `id="${id}-${instance}"`)
      .replaceAll(`#${id}"`, `#${id}-${instance}"`)
      .replaceAll(`#${id})`, `#${id}-${instance})`);
  }
  return scoped;
};

// On phones and tablets the 2 × 2 grid becomes one column of cards, with the heading scaled to fit above it.
const NARROW_QUERY = "(max-width: 1024px)";
const WIDE_EYEBROW = 1.39;
const NARROW = { width: 680, cardX: 40, firstCardY: 8, cardGap: 28, bottom: 36 };

const applyLayout = (stage: HTMLElement, narrow: boolean) => {
  const svg = stage.querySelector("svg");
  if (!svg) return;

  const cards = Array.from(svg.querySelectorAll<SVGGElement>(".card"));
  const headings = Array.from(svg.querySelectorAll<SVGElement>(":scope > text"));
  const backdrop = svg.querySelector<SVGRectElement>(":scope > rect");

  // Remember the supplied geometry the first time so the wide layout can always be restored exactly.
  svg.dataset["wide"] ??= JSON.stringify({
    viewBox: svg.getAttribute("viewBox"),
    width: svg.getAttribute("width"),
    height: svg.getAttribute("height"),
    cards: cards.map((card) => card.getAttribute("transform")),
  });
  const wide = JSON.parse(svg.dataset["wide"]) as {
    viewBox: string;
    width: string;
    height: string;
    cards: string[];
  };

  if (!narrow) {
    svg.setAttribute("viewBox", wide.viewBox);
    svg.setAttribute("width", wide.width);
    svg.setAttribute("height", wide.height);
    cards.forEach((card, index) => card.setAttribute("transform", wide.cards[index] ?? ""));
    // The eyebrow is drawn small beside the heading, so it is enlarged about its own centre here too.
    headings.forEach((heading, index) => {
      heading.removeAttribute("display");
      if (index === 0) heading.setAttribute("transform", `translate(720 105) scale(${WIDE_EYEBROW}) translate(-720 -105)`);
      else heading.removeAttribute("transform");
    });
    backdrop?.setAttribute("width", wide.width);
    backdrop?.setAttribute("height", wide.height);
    return;
  }

  const { width, cardX, firstCardY, cardGap, bottom } = NARROW;
  const height = firstCardY + cards.length * 594 + (cards.length - 1) * cardGap + bottom;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  cards.forEach((card, index) => card.setAttribute("transform", `translate(${cardX} ${firstCardY + index * (594 + cardGap)})`));
  // The heading and eyebrow are real text above the artwork on these screens (see .section-head), so hide the drawn ones.
  headings.forEach((item) => item.setAttribute("display", "none"));
  backdrop?.setAttribute("width", String(width));
  backdrop?.setAttribute("height", String(height));
};

/**
 * The case study listing artwork, inlined so the hover styling that ships inside it can run.
 * Until it loads the plain image shows. Cards open their case study, in the order of `caseStudies`.
 */
export function WorkListing({ instance }: { instance: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [markup, setMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadListing()
      .then((text) => {
        if (!cancelled) setMarkup(scopeIds(text, instance));
      })
      .catch(() => {
        listingMarkup = null;
      });
    return () => {
      cancelled = true;
    };
  }, [instance]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !markup) return;

    stage.querySelectorAll<SVGGElement>(".card").forEach((card, index) => {
      const study = caseStudies[index];
      if (!study) return;
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `${study.title} case study`);
    });
  }, [markup]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !markup) return;

    const query = window.matchMedia(NARROW_QUERY);
    const update = () => applyLayout(stage, query.matches);
    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, [markup]);

  // A card that was opened is left without its hover lift; bring it back when Work is shown again.
  useEffect(() => {
    const reset = () => {
      delete stageRef.current?.dataset["leaving"];
    };
    window.addEventListener("portfolio:open-work", reset);
    window.addEventListener("portfolio:open-home", reset);
    return () => {
      window.removeEventListener("portfolio:open-work", reset);
      window.removeEventListener("portfolio:open-home", reset);
    };
  }, []);

  const studyFor = (target: EventTarget | null) => {
    const stage = stageRef.current;
    const card = (target as Element | null)?.closest(".card");
    if (!stage || !card) return undefined;
    return caseStudies[Array.from(stage.querySelectorAll(".card")).indexOf(card)];
  };

  const openCard = (target: EventTarget | null) => {
    const study = studyFor(target);
    if (!study || !stageRef.current) return;

    // Drop the hover lift and shadow before the page is captured for the transition.
    stageRef.current.dataset["leaving"] = "true";
    (document.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new CustomEvent("portfolio:request-case", { detail: { slug: study.slug } }));
  };

  const warmCard = (target: EventTarget | null) => {
    const study = studyFor(target);
    if (study) void preloadCaseStudy(study.slug);
  };

  if (!markup) {
    return (
      <img
        className="work-page-artwork"
        src={caseStudyListing.url}
        width={caseStudyListing.width}
        height={caseStudyListing.height}
        alt=""
      />
    );
  }

  return (
    <div
      ref={stageRef}
      className="work-page-artwork"
      style={{ aspectRatio: "auto" }}
      onPointerOver={(event) => warmCard(event.target)}
      onFocus={(event) => warmCard(event.target)}
      // Clicking must not focus the card: the browser draws a dark focus box around it. Keyboard focus still shows one.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => openCard(event.target)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCard(event.target);
        }
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

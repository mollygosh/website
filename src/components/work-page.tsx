import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SiteFooter } from "@/components/site-footer";
import { WorkListing } from "@/components/work-listing";
import { caseStudies } from "@/lib/case-studies";

// Card positions in the phone listing artwork (375 × 1792).
const PHONE_CARDS = [
  { y: 136.5, h: 382 },
  { y: 539.5, h: 382 },
  { y: 942.5, h: 379 },
  { y: 1342.5, h: 379 },
];

export function WorkPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isWorkOpen, setIsWorkOpen] = useState(false);

  useEffect(() => {
    // A hidden page keeps its scroll offset and would restore it on the next open, so rewind before hiding.
    const close = () => {
      if (sectionRef.current) sectionRef.current.scrollTop = 0;
      flushSync(() => setIsWorkOpen(false));
    };

    const open = () => {
      const section = sectionRef.current;
      if (!section) return;

      flushSync(() => setIsWorkOpen(true));
      section.scrollTop = 0;
      window.history.replaceState(null, "", "#work");
    };

    window.addEventListener("portfolio:open-work", open);
    for (const name of ["home", "about", "play", "case"]) window.addEventListener(`portfolio:open-${name}`, close);
    return () => {
      window.removeEventListener("portfolio:open-work", open);
      for (const name of ["home", "about", "play", "case"]) window.removeEventListener(`portfolio:open-${name}`, close);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="work"
      className="work-page"
      data-work-open={isWorkOpen}
      aria-label="Selected works: a glimpse into intentionally designed experiences"
    >
      <div className="work-page-box">
        <div className="section-head">
          <p className="section-eyebrow">Selected works</p>
          <h2 className="section-title">A glimpse into intentionally designed experiences</h2>
        </div>
        <WorkListing instance="page" />
        <div className="work-phone-art">
          <img src="/assets/case-studies/index-mobile.svg" width={375} height={1792} alt="" />
          {PHONE_CARDS.map((card, index) => {
            const study = caseStudies[index];
            if (!study) return null;
            return (
              <a
                key={study.slug}
                className="work-phone-link"
                href={`#case-${study.slug}`}
                aria-label={`${study.title} case study`}
                style={{ left: `${(24.5 / 375) * 100}%`, top: `${(card.y / 1792) * 100}%`, width: `${(326 / 375) * 100}%`, height: `${(card.h / 1792) * 100}%` }}
                onClick={(event) => {
                  event.preventDefault();
                  window.dispatchEvent(new CustomEvent("portfolio:request-case", { detail: { slug: study.slug } }));
                }}
              />
            );
          })}
        </div>
      </div>
      <SiteFooter />
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SiteFooter } from "@/components/site-footer";
import { WorkListing } from "@/components/work-listing";

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
      </div>
      <SiteFooter />
    </section>
  );
}

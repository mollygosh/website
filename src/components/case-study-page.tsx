import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SiteFooter } from "@/components/site-footer";

import { caseStudies } from "@/lib/case-studies";

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const SunIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg {...iconProps}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export function CaseStudyPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);

  useEffect(() => {
    // A hidden page keeps its scroll offset and would restore it on the next open, so rewind before hiding.
    const close = () => {
      if (sectionRef.current) sectionRef.current.scrollTop = 0;
      flushSync(() => setSlug(null));
    };

    const open = (event: Event) => {
      const section = sectionRef.current;
      const next = (event as CustomEvent<{ slug: string }>).detail?.slug;
      if (!section || !next) return;

      flushSync(() => {
        setVariant(0);
        setSlug(next);
      });
      section.scrollTop = 0;
      window.history.replaceState(null, "", `#case-${next}`);
    };

    window.addEventListener("portfolio:open-case", open);
    for (const name of ["home", "work", "about", "play"]) window.addEventListener(`portfolio:open-${name}`, close);
    return () => {
      window.removeEventListener("portfolio:open-case", open);
      for (const name of ["home", "work", "about", "play"]) window.removeEventListener(`portfolio:open-${name}`, close);
    };
  }, []);

  const study = caseStudies.find((item) => item.slug === slug);
  const artwork = study ? (study.artwork[variant] ?? study.artwork[0]) : null;


  return (
    <section
      ref={sectionRef}
      id="case-study"
      className="case-study-page"
      data-case-open={study ? "true" : "false"}
      aria-label={study ? `Case study: ${study.title}` : "Case study"}
    >
      <div className="case-study-page-box">
        {study && artwork ? (
          <>
            <div className="case-study-controls">
              {study.artwork.length > 1 ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={variant === 1}
                  aria-label="Dark theme"
                  className="case-study-switch"
                  data-dark={variant === 1}
                  onClick={() => setVariant(variant === 1 ? 0 : 1)}
                >
                  <span className="case-study-switch-icon"><SunIcon /></span>
                  <span className="case-study-switch-icon"><MoonIcon /></span>
                  <span className="case-study-switch-thumb" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="case-study-artworks">
              {study.artwork.map((item, index) => (
                <img
                  key={item.url}
                  className="case-study-artwork"
                  data-active={item === artwork}
                  src={item.url}
                  width={item.width}
                  height={item.height}
                  alt={item === artwork ? `${study.title} case study` : ""}
                  aria-hidden={item === artwork ? undefined : true}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <SiteFooter />
    </section>
  );
}

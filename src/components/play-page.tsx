import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SiteFooter } from "@/components/site-footer";

import { collageAsset, playHeadingsAsset } from "@/lib/assets";

export function PlayPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isPlayOpen, setIsPlayOpen] = useState(false);

  useEffect(() => {
    // A hidden page keeps its scroll offset and would restore it on the next open, so rewind before hiding.
    const close = () => {
      if (sectionRef.current) sectionRef.current.scrollTop = 0;
      flushSync(() => setIsPlayOpen(false));
    };

    const open = () => {
      const section = sectionRef.current;
      if (!section) return;

      flushSync(() => setIsPlayOpen(true));
      section.scrollTop = 0;
      window.history.replaceState(null, "", "#play");
    };

    window.addEventListener("portfolio:open-play", open);
    window.addEventListener("portfolio:open-home", close);
    window.addEventListener("portfolio:open-work", close);
    window.addEventListener("portfolio:open-about", close);
    window.addEventListener("portfolio:open-case", close);
    return () => {
      window.removeEventListener("portfolio:open-play", open);
      window.removeEventListener("portfolio:open-home", close);
      window.removeEventListener("portfolio:open-work", close);
      window.removeEventListener("portfolio:open-about", close);
      window.removeEventListener("portfolio:open-case", close);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="play"
      className="play-page"
      data-play-open={isPlayOpen}
      aria-label="Play: Handcrafted Stories — A collection of my creative detours"
    >
      <div className="play-page-box">
        <div className="play-page-intro">
          <div className="section-head">
            <p className="section-eyebrow">Handcrafted stories</p>
            <h2 className="section-title">A collection of my creative detours</h2>
          </div>
          <img
            className="play-page-heading-artwork"
            src={playHeadingsAsset.url}
            alt="Handcrafted Stories — A collection of my creative detours"
          />
        </div>
        <img
          className="play-page-collage"
          src={collageAsset.url}
          alt="A collage of Molly Doshi’s handcrafted textile, crochet, beadwork, and print projects"
        />
      </div>
      <SiteFooter />
    </section>
  );
}
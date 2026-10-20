import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SiteFooter } from "@/components/site-footer";

import { aboutPageAsset, aboutPortraitAsset, contactEmail, resumeAsset } from "@/lib/assets";

const NARRATIVE = [
  "I’m a UI/UX Designer with a background in textile design and a love for making complex things feel simple. With 6+ years of experience in design, I’ve developed a keen eye for detail and a strong appreciation for thoughtful craft. I’m naturally curious about how people think, interact, and use the things we design.",
  "I enjoy creating interfaces that feel simple, intuitive, and easy to navigate, with a little extra attention to all the tiny details that make an experience feel just right. That instinct to notice the little things is something I carry with me, both on and off the screen.",
  "I’ve always been drawn to the creative details around me and find inspiration in the most unexpected places — the soft pastel blue of a cloud-filled sky or the patterns created by raindrops on a window. I enjoy collecting these little moments and letting them find their way into my creative work.",
];

const QUOTE =
  "This curiosity has also shaped my love for travel, especially solo journeys through the quieter, more natural parts of India, where I can slow down and step away from the everyday routines. Nature has a way of bringing me back to myself — “a quiet corner, a sketchbook, a little greenery, and the gentle soundtrack of birds is often all I need.”";

const TIMELINE = [
  { role: "UI/UX Designer", company: "Asmadiya Technologies", dates: "April 2026 - Present" },
  { role: "UI/UX Design Intern", company: "DesignMe", dates: "Dec 2025 - Feb 2026" },
  { role: "Freelance Textile Designer", company: null, dates: "Jan 2024 - Jun 2025" },
  { role: "Executive Textile Designer", company: "Jawandsons Pvt. Ltd.", dates: "Jan 2021 - Dec 2023" },
  { role: "Assistant Textile Designer", company: "Ginza Industries", dates: "May 2019 - Dec 2020" },
];

/** Phone layout: the same content as the supplied artwork, set as real text so it wraps and stays readable. */
function AboutMobile() {
  return (
    <div className="about-mobile">
      <div className="about-mobile-portrait" role="img" aria-label="Molly Doshi" style={{ backgroundImage: `url(${aboutPortraitAsset.url})` }} />

      <p className="about-mobile-eyebrow">Personal narrative</p>
      <h2 className="about-mobile-title">A little glimpse into my curious world</h2>
      {NARRATIVE.map((paragraph) => (
        <p key={paragraph} className="about-mobile-body">
          {paragraph}
        </p>
      ))}
      <blockquote className="about-mobile-quote">{QUOTE}</blockquote>

      <hr className="about-mobile-rule" />

      <p className="about-mobile-eyebrow">Evolution and timeline</p>
      <h2 className="about-mobile-title">My journey as a designer</h2>
      <p className="about-mobile-body">
        A journey across materials, mediums, and moments — from shaping textiles to shaping digital experiences.
      </p>
      <a className="about-mobile-resume" href={resumeAsset.url} download={resumeAsset.filename}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
        </svg>
        Download Resume
      </a>

      <ul className="about-mobile-timeline">
        {TIMELINE.map((item) => (
          <li key={item.role + item.dates} className="about-mobile-job">
            <p className="about-mobile-role">
              {item.role}
              {item.company ? ` @ ${item.company}` : ""}
            </p>
            <p className="about-mobile-dates">{item.dates}</p>
          </li>
        ))}
      </ul>

      <div className="about-mobile-cta">
        <h2 className="about-mobile-cta-title">Let's craft meaningful experiences together</h2>
        <p className="about-mobile-cta-body">
          Open for collaborative digital products, user interface architecture, and thoughtful brand interfaces.
        </p>
        <a className="about-mobile-hello" href={`mailto:${contactEmail}`}>
          Say hello
        </a>
      </div>
    </div>
  );
}

export function AboutPage() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    // A hidden page keeps its scroll offset and would restore it on the next open, so rewind before hiding.
    const close = () => {
      if (sectionRef.current) sectionRef.current.scrollTop = 0;
      flushSync(() => setIsAboutOpen(false));
    };

    const open = () => {
      const section = sectionRef.current;
      if (!section) return;

      flushSync(() => setIsAboutOpen(true));
      section.scrollTop = 0;
      window.history.replaceState(null, "", "#about");
    };

    window.addEventListener("portfolio:open-about", open);
    window.addEventListener("portfolio:open-home", close);
    window.addEventListener("portfolio:open-work", close);
    window.addEventListener("portfolio:open-play", close);
    window.addEventListener("portfolio:open-case", close);
    return () => {
      window.removeEventListener("portfolio:open-about", open);
      window.removeEventListener("portfolio:open-home", close);
      window.removeEventListener("portfolio:open-work", close);
      window.removeEventListener("portfolio:open-play", close);
      window.removeEventListener("portfolio:open-case", close);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="about-page"
      data-about-open={isAboutOpen}
      aria-label="About Molly Doshi"
    >
      <div className="about-page-box">
        <div className="about-page-artwork-frame">
          <img
            className="about-page-artwork"
            src={aboutPageAsset.url}
            alt="About Molly Doshi"
          />
          <a
            className="about-page-resume"
            href={resumeAsset.url}
            download={resumeAsset.filename}
            aria-label="Download Molly Doshi's resume (PDF)"
          />
          <a
            className="about-page-hello"
            href={`mailto:${contactEmail}`}
            aria-label={`Say hello: email ${contactEmail}`}
          />
        </div>
        <AboutMobile />
      </div>
      <SiteFooter />
    </section>
  );
}
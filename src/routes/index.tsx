import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { TextileScroll } from "@/components/textile-scroll";
import { ConnectedUiScroll } from "@/components/connected-ui-scroll";
import { WorkPage } from "@/components/work-page";
import { AboutPage } from "@/components/about-page";
import { PlayPage } from "@/components/play-page";
import { CaseStudyPage } from "@/components/case-study-page";
import { polygonsAsset, portraitAsset } from "@/lib/assets";
import { preparePage, preloadSiteArtwork } from "@/lib/preload";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Molly Doshi — UI/UX Designer" },
      {
        name: "description",
        content: "Portfolio of Molly Doshi, a UI/UX designer creating thoughtful experiences through systems, craft, and curiosity.",
      },
      { property: "og:title", content: "Molly Doshi — UI/UX Designer" },
      {
        property: "og:description",
        content: "Thoughtful digital experiences shaped through systems, craft, and curiosity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Destination = "home" | "work" | "about" | "play" | "case";

function Index() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAboutActive, setIsAboutActive] = useState(false);
  const destinationRef = useRef<Destination>("home");
  const pressedRef = useRef<{ link: Element; x: number; y: number } | null>(null);

  // Every destination change is one push transition: the browser snapshots the screen the visitor
  // is on now, slides it up and out, and raises the destination (with the header) from the bottom.
  // Duration and easing live in styles.css, so every combination moves at the same speed.
  const go = (destination: Destination, slug?: string) => {
    const isOverlay = destination !== "home";
    const overlayOpen = destinationRef.current !== "home";
    if (isOverlay && destination === destinationRef.current && destination !== "case") return;
    if (!isOverlay && !overlayOpen) {
      if (window.scrollY < 2) return;
    }

    const apply = () => {
      // The link that was clicked keeps focus, and keyboard scrolling then makes it look "focused" (gradient) on the new page.
      (document.activeElement as HTMLElement | null)?.blur();
      flushSync(() => setIsAboutActive(isOverlay));
      window.dispatchEvent(new CustomEvent(`portfolio:open-${destination}`, { detail: { slug } }));

      if (destination === "home") {
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        window.scrollTo({ top: 0, behavior: "auto" });
        window.history.replaceState(null, "", window.location.pathname);
        root.style.scrollBehavior = previousScrollBehavior;
      }

      // Keep the header inside the overlay's own scrollbar so it never spills past the page box.
      const overlay = isOverlay ? document.getElementById(destination === "case" ? "case-study" : destination) : null;
      document.documentElement.style.setProperty(
        "--overlay-scrollbar",
        `${overlay ? overlay.offsetWidth - overlay.clientWidth : 0}px`,
      );

      // Overlay destinations scroll on their own; the page behind them stays put.
      document.documentElement.style.overflow = isOverlay ? "hidden" : "";
      document.body.style.overflow = isOverlay ? "hidden" : "";
      destinationRef.current = destination;
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("startViewTransition" in document)) {
      apply();
      return;
    }

    // Let the destination's artwork load and decode first: pushing in a half-painted page is what looks choppy.
    const ready = Promise.race([preparePage(destination, slug), new Promise((resolve) => setTimeout(resolve, 3000))]);
    void ready.then(() => document.startViewTransition(apply));
  };

  const navigate = (destination: Destination) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    go(destination);
  };

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 800));
    idle(preloadSiteArtwork);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const pressed = pressedRef.current;
      if (!pressed || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 6) return;
      pressed.link.removeAttribute("data-pressed");
      pressedRef.current = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const goRef = useRef(go);
  goRef.current = go;
  useEffect(() => {
    const requestCase = (event: Event) => {
      const slug = (event as CustomEvent<{ slug: string }>).detail?.slug;
      if (slug) goRef.current("case", slug);
    };
    window.addEventListener("portfolio:request-case", requestCase);
    return () => {
      window.removeEventListener("portfolio:request-case", requestCase);
    };
  }, []);

  // The home scroll ends on the finished interface; scrolling on from there carries the visitor into Work.
  useEffect(() => {
    let pushed = 0;
    let touchStart = 0;
    let arrivedAt = 0;

    const atBottom = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const onHome = () => destinationRef.current === "home";

    const push = (amount: number) => {
      if (!onHome() || !atBottom()) {
        pushed = 0;
        arrivedAt = 0;
        return;
      }
      // Momentum from reaching the bottom should not count as an intent to leave.
      const now = performance.now();
      if (!arrivedAt) arrivedAt = now;
      if (now - arrivedAt < 350) return;

      pushed += amount;
      if (pushed > 60) {
        pushed = 0;
        arrivedAt = 0;
        goRef.current("work");
      }
    };

    const onWheel = (event: WheelEvent) => push(Math.max(0, event.deltaY));
    const onTouchStart = (event: TouchEvent) => {
      touchStart = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchStart;
      push(Math.max(0, touchStart - y) > 40 ? 61 : 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "End"].includes(event.key)) push(61);
    };
    const onScroll = () => {
      if (!atBottom()) {
        pushed = 0;
        arrivedAt = 0;
      } else if (!arrivedAt) {
        arrivedAt = performance.now();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const openWork = navigate("work");
  const openAbout = navigate("about");
  const openPlay = navigate("play");
  const openHome = navigate("home");

  useEffect(() => {
    const updateScroll = () => {
      setScrollProgress(Math.min(window.scrollY / (window.innerHeight * 0.72), 1));
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);

  const polygonOpacity = Math.max(0, 1 - Math.max(0, scrollProgress - 0.12) / 0.52);
  const portraitOpacity = Math.max(0, 1 - Math.max(0, scrollProgress - 0.5) * 2.2);
  const polygonLift = scrollProgress * -18;

  const artworkStyle = {
    "--polygon-opacity": polygonOpacity,
    "--portrait-opacity": portraitOpacity,
    "--polygon-lift": polygonLift,
  } as React.CSSProperties;

  return (
    <main id="top" className="portfolio-page">
      <header
        className="site-header"
        data-about-active={isAboutActive}
        aria-label="Primary navigation"
      >
        <div
          className="site-header-inner"
          // After a click the pointer is still over the link, so its hover effect would linger on the next page.
          // Hold it off until the pointer actually moves away (see the effect below).
          onClick={(event) => {
            const link = (event.target as Element).closest("a");
            if (!link) return;
            link.setAttribute("data-pressed", "true");
            pressedRef.current = { link, x: event.clientX, y: event.clientY };
          }}
        >
          <a className="monogram" href="#top" aria-label="Return to the top of Molly Doshi's portfolio" onClick={openHome}></a>
          <nav className="primary-nav" aria-label="Portfolio sections">
            <a className="nav-link" href="#work" data-text="Work" onClick={openWork}>Work</a>
            <a className="nav-link" href="#play" data-text="Play" onClick={openPlay}>Play</a>
            <a className="nav-link" href="#about" data-text="About" onClick={openAbout}>About</a>
          </nav>
        </div>
      </header>

      <div className="portfolio-content">
        <section className="intro" aria-labelledby="intro-heading">
          <div className="intro-copy">
            <p className="intro-kicker">Hello, I’m</p>
            <h1 id="intro-heading">Molly Doshi</h1>
            <p className="intro-statement">
              I design thoughtful design experiences
              <br className="desktop-break" /> through <span className="word-systems">systems</span>, <span className="word-craft">craft</span> and <span className="word-curiosity">curiosity</span>
            </p>
          </div>

          <div className="artwork" style={artworkStyle} aria-hidden="true">
            <img className="polygon-field" src={polygonsAsset.url} alt="" />
            <img className="portrait" src={portraitAsset.url} alt="" />
          </div>
        </section>

        <TextileScroll />

        <ConnectedUiScroll />

      </div>

      <WorkPage />
      <AboutPage />
      <PlayPage />
      <CaseStudyPage />
    </main>
  );
}
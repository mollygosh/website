import { Fragment, useEffect, useRef, useState } from "react";

import { connectedUiVector } from "@/lib/assets";

const VIEWBOX_WIDTH = 1325;
const VIEWBOX_HEIGHT = 861;
const FORMATION_START = 0.03;
const FORMATION_FOREGROUND_END = 0.99;
const FORMATION_COMPLETE = 0.8;
const FIRST_SENTENCE_FADE_END = 0.83;
const SECOND_SENTENCE_START = 0.84;
const SECOND_SENTENCE_REVEAL_END = 0.92;
const DIGITAL_SENTENCE = "The medium evolved to digital experiences";
const DIGITAL_SENTENCE_WORDS = DIGITAL_SENTENCE.split(" ");
const CURIOSITY_SENTENCE = "The curiosity stayed, expressed through observation, ideas and execution.";
const CURIOSITY_LINES = [
  ["The", "curiosity", "stayed,", "expressed", "through"],
  ["observation,", "ideas", "and", "execution."],
] as const;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3);

type Bounds = readonly [x: number, y: number, width: number, height: number];

type FormationStage = {
  start: number;
  bounds: Bounds;
  connector?: boolean;
  svgStage?: number;
};

// These bounds follow the uploaded SVG exactly. Frames include their complete
// background, outline, icons, internal marks, and original padding as one unit.
const SOURCE_STAGES: readonly FormationStage[] = [
  { start: 0.03, bounds: [3, 218, 62, 302] },
  { start: 0.075, bounds: [28, 102, 103, 108], connector: true },
  { start: 0.105, bounds: [0, 26, 68, 68] },
  { start: 0.135, bounds: [75, 51, 47, 12], connector: true },
  { start: 0.165, bounds: [134, 26, 342, 62] },
  { start: 0.195, bounds: [484, 51, 61, 12], connector: true },
  { start: 0.225, bounds: [556, 26, 62, 62] },
  { start: 0.255, bounds: [633, 51, 55, 18], connector: true },
  { start: 0.285, bounds: [701, 0, 278, 127] },
  { start: 0.315, bounds: [985, 74, 52, 141], connector: true },
  { start: 0.345, bounds: [1073, 56, 182, 62] },
  { start: 0.375, bounds: [1001, 242, 52, 52] },
  { start: 0.405, bounds: [1001, 306, 52, 52] },
  { start: 0.435, bounds: [1001, 370, 52, 52] },
  { start: 0.465, bounds: [1064, 395, 65, 18], connector: true },
  { start: 0.495, bounds: [1133, 341, 192, 117] },
  { start: 0.525, bounds: [1001, 434, 52, 52] },
  { start: 0.555, bounds: [1021, 503, 9, 81], connector: true },
  { start: 0.585, bounds: [900, 595, 270, 149] },
  { start: 0.615, bounds: [74, 383, 39, 18], connector: true },
  { start: 0.645, bounds: [121, 335, 110, 111] },
  { start: 0.675, bounds: [76, 197, 125, 62], connector: true },
  { start: 0.705, bounds: [143, 138, 101, 43] },
  { start: 0.735, bounds: [74, 481, 118, 63], connector: true },
  { start: 0.765, bounds: [161, 568, 60, 60] },
  { start: 0.795, bounds: [230, 593, 32, 56], connector: true },
  { start: 0.825, bounds: [122, 660, 260, 154] },
  { start: 0.855, bounds: [421, 774, 399, 40] },
  { start: 0.885, bounds: [827, 787, 175, 53], connector: true },
  { start: 0.915, bounds: [907, 814, 79, 47] },
];

// The rail's right-hand connector and its attached frame form immediately
// after the rail, rather than waiting for the far side of the composition.
const FORMATION_ORDER = [0, 19, 20, 21, 22, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 23, 24, 25, 26, 27, 28, 29] as const;
const STAGES: readonly FormationStage[] = FORMATION_ORDER.map((svgStage, orderIndex) => {
  const source = SOURCE_STAGES[svgStage];
  if (!source) throw new Error(`Missing SVG formation stage ${svgStage}`);
  return {
    ...source,
    svgStage,
    start: 0.03 + orderIndex * 0.025,
  };
});

const getStageDuration = (index: number) => {
  const stage = STAGES[index];
  const nextStage = STAGES[index + 1];
  if (!stage) return 0;
  return nextStage ? Math.max(0.018, nextStage.start - stage.start) : 0.04;
};

type Particle = {
  x: number;
  y: number;
  stage: number;
  color: string;
  seed: number;
};

const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 91.73 + salt * 37.19) * 43758.5453;
  return value - Math.floor(value);
};

export function ConnectedUiScroll() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const artworkRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [sentenceProgress, setSentenceProgress] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(connectedUiVector.url)
      .then((response) => response.text())
      .then((markup) => {
        if (active) setSvgMarkup(markup);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const artwork = artworkRef.current;
    if (!canvas || !artwork || !svgMarkup) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const paletteStyles = getComputedStyle(document.documentElement);
    const palette = [
      paletteStyles.getPropertyValue("--ui-purple").trim(),
      paletteStyles.getPropertyValue("--ui-rose").trim(),
      paletteStyles.getPropertyValue("--ui-blue").trim(),
      paletteStyles.getPropertyValue("--ui-teal").trim(),
    ].filter(Boolean);
    const fallbackColor = palette[0] ?? "currentColor";
    const particles: Particle[] = [];

    STAGES.forEach((stage, stageIndex) => {
      const [x, y, stageWidth, stageHeight] = stage.bounds;
      const count = stage.connector ? 16 : Math.min(78, Math.max(34, Math.round((stageWidth * stageHeight) / 1250)));
      for (let index = 0; index < count; index++) {
        const seed = seeded(index + stageIndex * 131, 4);
        particles.push({
          x: x + seeded(index + stageIndex * 71, 7) * stageWidth,
          y: y + seeded(index + stageIndex * 97, 9) * stageHeight,
          stage: stageIndex,
          color: palette[(index + stageIndex) % palette.length] ?? fallbackColor,
          seed,
        });
      }
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let artworkScale = 1;
    let artworkOffsetX = 0;
    let artworkOffsetY = 0;
    let progress = 0;
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const svg = artwork.querySelector("svg");
      if (svg) {
        const svgBounds = svg.getBoundingClientRect();
        artworkScale = svgBounds.width / VIEWBOX_WIDTH;
        artworkOffsetX = svgBounds.left - bounds.left;
        artworkOffsetY = svgBounds.top - bounds.top;
      }
    };

    const readProgress = () => {
      const section = sectionRef.current;
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      const travel = bounds.height - window.innerHeight;
      progress = travel > 0 ? clamp01(-bounds.top / travel) : 0;
      setSentenceProgress(progress);
      section.dataset["formationActive"] = String(
        progress >= FORMATION_START && progress < 1,
      );
    };

    const draw = () => {
      frame = requestAnimationFrame(draw);
      context.clearRect(0, 0, width, height);

      STAGES.forEach((stage, index) => {
        // Finish every complete SVG group before beginning the next one.
        const duration = getStageDuration(index);
        const alpha = reduced
          ? Number(progress >= stage.start)
          : easeOut(clamp01((progress - stage.start) / duration));
        artwork.style.setProperty(`--stage-${stage.svgStage ?? index}`, String(alpha));
      });

      if (progress <= 0 || progress >= FORMATION_FOREGROUND_END) return;
      context.save();
      context.translate(artworkOffsetX, artworkOffsetY);
      context.scale(artworkScale, artworkScale);

      particles.forEach((particle, index) => {
        const stage = STAGES[particle.stage];
        if (!stage) return;
        const stageDuration = getStageDuration(particle.stage);
        const arrival = stage.start + stageDuration * (0.72 + particle.seed * 0.22);
        const departure = Math.max(0, stage.start - 0.105) + particle.seed * 0.016;
        const local = clamp01((progress - departure) / Math.max(0.08, arrival - departure));
        if (local <= 0 || local >= 1) return;

        const eased = reduced ? local : easeOut(local);
        const startX = particle.x + (seeded(index, 13) - 0.5) * 230;
        const startY = -80 - seeded(index, 17) * 420;
        const x = startX + (particle.x - startX) * eased;
        const y = startY + (particle.y - startY) * eased;
        const size = 3 + Math.round(seeded(index, 19) * 4);

        context.globalAlpha = Math.min(1, local * 4) * Math.min(1, (1 - local) * 8) * 0.86;
        context.fillStyle = particle.color;
        context.fillRect(x, y, size, size);
      });

      context.restore();
      context.globalAlpha = 1;
    };

    const onResize = () => {
      resize();
      readProgress();
    };
    resize();
    readProgress();
    frame = requestAnimationFrame(draw);
    window.addEventListener("scroll", readProgress, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", readProgress);
      window.removeEventListener("resize", onResize);
    };
  }, [svgMarkup]);

  const firstRevealProgress = clamp01((sentenceProgress - 0.11) / 0.16);
  const firstFadeProgress = 1 - clamp01(
    (sentenceProgress - FORMATION_COMPLETE) / (FIRST_SENTENCE_FADE_END - FORMATION_COMPLETE),
  );
  const secondRevealProgress = clamp01(
    (sentenceProgress - SECOND_SENTENCE_START) / (SECOND_SENTENCE_REVEAL_END - SECOND_SENTENCE_START),
  );
  const secondWords = CURIOSITY_LINES.flat();
  return (
    <section ref={sectionRef} className="connected-ui-section" aria-label="Connected interface system">
      <div className="connected-ui-sticky">
        <div
          ref={artworkRef}
          className="connected-ui-vector"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
        <canvas ref={canvasRef} className="connected-ui-canvas" aria-hidden="true" />
        <p
          className="connected-ui-sentence connected-ui-sentence-primary"
          aria-label={DIGITAL_SENTENCE}
          style={{ opacity: firstFadeProgress }}
        >
          {DIGITAL_SENTENCE_WORDS.map((word, index) => {
            const start = (index / DIGITAL_SENTENCE_WORDS.length) * 0.68;
            const wordProgress = clamp01((firstRevealProgress - start) / 0.32);
            return (
              <Fragment key={word}>
                <span
                  className="connected-ui-sentence-word"
                  style={{
                    opacity: wordProgress,
                    transform: `translateY(${(1 - easeOut(wordProgress)) * 0.5}em)`,
                    filter: `blur(${(1 - wordProgress) * 4}px)`,
                  }}
                >
                  {word}
                </span>
                {/* Phones: "The medium evolved" / "to digital experiences" */}
                {index === 2 && <span className="connected-ui-sentence-mobile-break" aria-hidden="true" />}
              </Fragment>
            );
          })}
        </p>
        <p
          className="connected-ui-sentence connected-ui-sentence-secondary"
          aria-label={CURIOSITY_SENTENCE}
        >
          {CURIOSITY_LINES.map((line, lineIndex) => (
            <span key={lineIndex} className="connected-ui-sentence-line">
              {line.map((word) => {
                const wordIndex = secondWords.indexOf(word);
                const start = (wordIndex / secondWords.length) * 0.68;
                const wordProgress = clamp01((secondRevealProgress - start) / 0.32);
                const colorClass = word.startsWith("observation")
                  ? "word-craft"
                  : word === "ideas"
                    ? "word-systems"
                    : word.startsWith("execution")
                      ? "word-curiosity"
                      : undefined;
                return (
                  <span
                    key={word}
                    className={`connected-ui-sentence-word${colorClass ? ` ${colorClass}` : ""}`}
                    style={{
                      opacity: wordProgress,
                      transform: `translateY(${(1 - easeOut(wordProgress)) * 0.5}em)`,
                      filter: `blur(${(1 - wordProgress) * 4}px)`,
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
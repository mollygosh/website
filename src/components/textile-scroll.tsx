import { useEffect, useRef, useState } from "react";

type RawShapeData = {
  viewBox: [number, number];
  palette: string[];
  x: number[];
  y: number[];
  w: number[];
  h: number[];
  c: number[];
  t: number[];
  s: number[];
  g?: number[];
};

type ShapeData = {
  viewBox: [number, number];
  palette: string[];
  x: Float32Array;
  y: Float32Array;
  w: Float32Array;
  h: Float32Array;
  c: Uint8Array;
  t: Float32Array;
  s: Float32Array;
  g: Uint8Array;
};

const toTyped = (json: RawShapeData): ShapeData => ({
  viewBox: json.viewBox,
  palette: json.palette,
  x: Float32Array.from(json.x),
  y: Float32Array.from(json.y),
  w: Float32Array.from(json.w),
  h: Float32Array.from(json.h),
  c: Uint8Array.from(json.c),
  t: Float32Array.from(json.t),
  s: Float32Array.from(json.s),
  g: Uint8Array.from(json.g ?? json.x.map(() => 0)),
});

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => p * p * (3 - 2 * p);

// Below this width : height the screen is "tall" and the artwork pans instead of shrinking to fit.
const TALL_ASPECT = 1.25;

// [scroll progress, horizontal centre of the view in artwork units]
// Each shape takes IN_DUR to settle after its start time, so the camera stays on a group until it has landed.
const CAMERA_PATH: [number, number][] = [
  [0.0, 300],
  [0.17, 300],
  [0.2, 1050],
  [0.26, 1240],
  [0.47, 1240],
  [0.88, 700],
  [0.93, 210],
  [1, 210],
];
const cameraCentre = (prog: number) => {
  for (let i = 1; i < CAMERA_PATH.length; i++) {
    const [p1, x1] = CAMERA_PATH[i]!;
    if (prog <= p1) {
      const [p0, x0] = CAMERA_PATH[i - 1]!;
      return x0 + (x1 - x0) * easeInOut(clamp01((prog - p0) / (p1 - p0)));
    }
  }
  return CAMERA_PATH[CAMERA_PATH.length - 1]![1];
};

const BUILD_SPAN = 0.45; // arrivals spread across this much of the section
const IN_DUR = 0.08;
const OUT_START = 0.70;
const OUT_SPREAD = 0.14;
const OUT_DUR = 0.16;

const SENTENCE_LINES: { text: string; tone?: string }[][] = [
  [
    { text: "My" }, { text: "design" }, { text: "journey" }, { text: "began" },
    { text: "with" }, { text: "textiles," },
  ],
  [
    { text: "shaped" }, { text: "by" },
    { text: "craft,", tone: "word-systems" },
    { text: "colors", tone: "word-craft" },
    { text: "and" },
    { text: "precision.", tone: "word-curiosity" },
  ],
];

const SENTENCE = SENTENCE_LINES.flat();

export function TextileScroll() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<ShapeData | null>(null);
  const progressRef = useRef(0);
  const frameRef = useRef(0);
  const [sentenceProgress, setSentenceProgress] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/textile-shapes.json")
      .then((res) => res.json())
      .then((json: RawShapeData) => {
        if (alive) dataRef.current = toTyped(json);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const readProgress = () => {
      const node = sectionRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      progressRef.current = travel > 0 ? clamp01(-rect.top / travel) : 0;
    };

    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      const data = dataRef.current;
      if (!data || width === 0) return;

      const prog = progressRef.current;
      const [vw, vh] = data.viewBox;
      // Wide screens fill the full width. On tall, narrow screens the
      // artwork fills the full height instead and the view pans across it as the patterns arrive (left to right).
      const tall = width / height < TALL_ASPECT;
      let scale: number;
      let offX: number;
      let offY: number;
      if (tall) {
        scale = height / vh;
        // The camera follows the patterns in the order they arrive: checks (top left), diamonds (top right),
        // zigzag (bottom, right to left), then houndstooth (bottom left).
        const centre = cameraCentre(prog);
        const visible = width / scale;
        const clamped = Math.min(Math.max(centre, visible / 2), Math.max(visible / 2, vw - visible / 2));
        offX = width / 2 - clamped * scale;
        offY = 0;
      } else {
        // Full width on desktop. On wide, short windows the artwork is a little taller than the stage, so the
        // top and bottom edges are trimmed equally rather than leaving empty margins at the sides.
        scale = width / vw;
        offX = 0;
        offY = (height - vh * scale) / 2;
      }

      ctx.clearRect(0, 0, width, height);
      if (prog <= 0 || prog >= 1) return;

      ctx.save();

      const n = data.x.length;
      let currentColor = -1;
      let currentAlpha = -1;

      for (let i = 0; i < n; i++) {
        const seed = data.s[i]!;
        const inStart = data.t[i]! * BUILD_SPAN;
        const p = clamp01((prog - inStart) / IN_DUR);
        if (p <= 0) continue;

        const group = data.g[i]!;
        const outStart = OUT_START + seed * OUT_SPREAD;
        const q = clamp01((prog - outStart) / OUT_DUR);
        const entranceOnlyOpacity = group === 0
          ? 1 - clamp01((prog - 0.22) / 0.08)
          : 1;
        const alpha = p * entranceOnlyOpacity * (1 - q);
        if (alpha <= 0.01) continue;

        let dx = 0;
        let dy = 0;
        if (!reduced) {
          const e = easeOut(p);
          const fall = 1 - e;
          if (group === 2) {
            // diamond: streams in from the checks on its left
            dx -= fall * (110 + seed * 240);
            dy += Math.sin(seed * 7.3) * fall * 45;
          } else if (group === 3) {
            // zigzag: slides in from the right with a slight lift
            dx += fall * (120 + seed * 260);
            dy -= Math.sin(seed * 9.1) * fall * 40;
          } else if (group === 4) {
            // houndstooth: drifts in from the zigzag on its right
            dx += fall * (90 + seed * 200);
            dy += Math.sin(seed * 11.7) * fall * 35;
          } else {
            // scatter + checks: rain down from above
            dy -= fall * (70 + seed * 190);
            dx += Math.sin(seed * 13.7 + fall * 3.4) * fall * (14 + seed * 34);
          }
          if (q > 0) {
            const r = q * q;
            dy += r * (180 + seed * 620);
            dx += Math.sin(seed * 21.3 + q * 4.2) * q * (16 + seed * 40);
          }
        }

        const alphaKey = Math.round(alpha * 20);
        if (alphaKey !== currentAlpha) {
          currentAlpha = alphaKey;
          ctx.globalAlpha = alphaKey / 20;
        }
        const ci = data.c[i]!;
        if (ci !== currentColor) {
          currentColor = ci;
          ctx.fillStyle = data.palette[ci]!;
        }
        ctx.fillRect(offX + (data.x[i]! + dx) * scale, offY + (data.y[i]! + dy) * scale, data.w[i]! * scale, data.h[i]! * scale);
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const onScroll = () => {
      readProgress();
      const prog = progressRef.current;
      setSentenceProgress(
        clamp01((prog - 0.40) / 0.22) * (1 - clamp01((prog - 0.70) / 0.14)),
      );
    };

    resize();
    onScroll();
    frameRef.current = requestAnimationFrame(draw);
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => {
      resize();
      onScroll();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="textiles"
      className="textile-section"
      aria-label="Textile design origins"
    >
      <div className="textile-sticky">
        <canvas ref={canvasRef} className="textile-canvas" aria-hidden="true" />

        <p className="textile-sentence" aria-label={SENTENCE.map((w) => w.text).join(" ")}>
          {SENTENCE_LINES.map((line, lineIndex) => {
            const lineOffset = lineIndex === 0 ? 0 : 6;
            return (
              <span className="textile-sentence-line" key={lineIndex}>
                {line.map((word, wordIndex) => {
                  const index = lineOffset + wordIndex;
                  const start = (index / SENTENCE.length) * 0.75;
                  const wp = clamp01((sentenceProgress - start) / 0.25);
                  return (
                    <span
                      key={index}
                      className={word.tone ? `textile-word ${word.tone}` : "textile-word"}
                      style={{
                        opacity: wp,
                        transform: `translateY(${(1 - easeOut(wp)) * 0.5}em)`,
                        filter: `blur(${(1 - wp) * 4}px)`,
                      }}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

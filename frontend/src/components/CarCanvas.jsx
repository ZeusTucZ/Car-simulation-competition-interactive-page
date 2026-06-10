import { useMemo } from "react";
import useAnimatedValues from "../hooks/useAnimatedValues";

const VIEW_W = 760;
const VIEW_H = 360;
const SCALE = 150; // px per meter (side view)
const GROUND_Y = 300;
const WHEEL_RADIUS_M = 0.21;

// Height profile along the body: t=0 tail, t=1 nose. Blends between a
// rounded box (aeroT=0) and a water-drop silhouette (aeroT=1).
function topProfile(t, aeroT) {
  const box = Math.min(1, t / 0.07, (1 - t) / 0.1) ** 0.4;
  const tear = Math.sin(Math.PI * t ** 0.8) ** 0.95;
  return Math.max(box + (tear - box) * aeroT, 0.02);
}

function bottomLift(t, aeroT) {
  const nose = t > 0.76 ? (((t - 0.76) / 0.24) ** 2) * 0.2 : 0;
  const tail = t < 0.12 ? (((0.12 - t) / 0.12) ** 2) * 0.12 : 0;
  return (nose + tail) * (0.35 + 0.65 * aeroT);
}

function buildSidePath(xLeft, lengthPx, heightPx, aeroT, yBottom) {
  const steps = 56;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = xLeft + t * lengthPx;
    const y = yBottom - heightPx * topProfile(t, aeroT);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const t = i / steps;
    const x = xLeft + t * lengthPx;
    const y = yBottom - heightPx * bottomLift(t, aeroT);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

function buildStripePath(xLeft, lengthPx, heightPx, aeroT, yBottom) {
  const steps = 40;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = xLeft + t * lengthPx;
    const y = yBottom - heightPx * topProfile(t, aeroT) * 0.42;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points.join(" L ")}`;
}

function Wheel({ cx, cy, radius, tires }) {
  const isRain = tires === "rain";
  const tireWidth = tires === "eco" ? radius * 0.32 : radius * 0.48;
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill="#0b1320" stroke="#1f2c44" strokeWidth="2" />
      <circle
        cx={cx}
        cy={cy}
        r={radius - tireWidth / 2}
        fill="none"
        stroke="#162338"
        strokeWidth={tireWidth}
      />
      {isRain &&
        [0, 60, 120, 180, 240, 300].map((angle) => (
          <line
            key={angle}
            x1={cx + (radius - tireWidth) * Math.cos((angle * Math.PI) / 180)}
            y1={cy + (radius - tireWidth) * Math.sin((angle * Math.PI) / 180)}
            x2={cx + radius * Math.cos((angle * Math.PI) / 180)}
            y2={cy + radius * Math.sin((angle * Math.PI) / 180)}
            stroke="#22e5ff"
            strokeWidth="2.5"
            opacity="0.7"
          />
        ))}
      <circle cx={cx} cy={cy} r={radius * 0.32} fill="#0e1828" stroke="#22e5ff" strokeWidth="2" opacity="0.9" />
      <circle cx={cx} cy={cy} r={radius * 0.1} fill="#22e5ff" />
    </g>
  );
}

function RainOverlay() {
  const drops = Array.from({ length: 26 }, (_, i) => ({
    x: 14 + i * 29 + (i % 3) * 7,
    delay: -(i * 0.09) % 0.75,
    duration: 0.6 + (i % 4) * 0.08,
  }));
  return (
    <g>
      {drops.map((drop) => (
        <line
          key={drop.x}
          className="rain-drop"
          x1={drop.x}
          y1={-30}
          x2={drop.x - 7}
          y2={-6}
          stroke="#7df3ff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
          style={{ animationDelay: `${drop.delay}s`, animationDuration: `${drop.duration}s` }}
        />
      ))}
    </g>
  );
}

function Sun() {
  return (
    <g className="sun-glow">
      <circle cx={VIEW_W - 80} cy={64} r={26} fill="#b4ff39" opacity="0.9" />
      <circle cx={VIEW_W - 80} cy={64} r={40} fill="#b4ff39" opacity="0.16" />
      <circle cx={VIEW_W - 80} cy={64} r={56} fill="#b4ff39" opacity="0.07" />
    </g>
  );
}

export default function CarCanvas({ design }) {
  const animated = useAnimatedValues(
    useMemo(
      () => ({
        length: design.length,
        width: design.width,
        height: design.height,
        aero: design.aero,
        mass: design.mass,
      }),
      [design.length, design.width, design.height, design.aero, design.mass],
    ),
  );

  const aeroT = animated.aero / 100;
  const lengthPx = animated.length * SCALE;
  const heightPx = animated.height * SCALE;
  const wheelR = WHEEL_RADIUS_M * SCALE;
  const xLeft = (VIEW_W - lengthPx) / 2;
  const yBottom = GROUND_Y - wheelR * 1.05;

  const bodyPath = buildSidePath(xLeft, lengthPx, heightPx, aeroT, yBottom);
  const stripePath = buildStripePath(xLeft, lengthPx, heightPx, aeroT, yBottom);

  const isRainy = design.weather === "rainy";
  // Heavier cars sit lower on the suspension: subtle but alive.
  const squash = ((animated.mass - 60) / 140) * 3;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Vista lateral del prototipo, cambia con los parámetros"
      >
        <defs>
          <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isRainy ? "#15243d" : "#16294a"} />
            <stop offset="55%" stopColor="#0d1a30" />
            <stop offset="100%" stopColor="#091224" />
          </linearGradient>
          <linearGradient id="canopyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7df3ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#22e5ff" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="stripeStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22e5ff" stopOpacity="0.15" />
            <stop offset="55%" stopColor="#22e5ff" />
            <stop offset="100%" stopColor="#b4ff39" />
          </linearGradient>
          <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id="bodyClip">
            <path d={bodyPath} />
          </clipPath>
        </defs>

        {isRainy ? <RainOverlay /> : <Sun />}

        {/* ground */}
        <line
          x1="30"
          y1={GROUND_Y}
          x2={VIEW_W - 30}
          y2={GROUND_Y}
          stroke="#22e5ff"
          strokeWidth="2"
          opacity="0.5"
        />
        <line
          className="track-flow"
          x1="30"
          y1={GROUND_Y + 10}
          x2={VIEW_W - 30}
          y2={GROUND_Y + 10}
          stroke="#22e5ff"
          strokeWidth="2"
          opacity="0.3"
        />

        <g transform={`translate(0 ${squash.toFixed(2)})`}>
          {/* under glow */}
          <ellipse
            cx={VIEW_W / 2}
            cy={GROUND_Y + 4}
            rx={lengthPx * 0.46}
            ry="11"
            fill="#22e5ff"
            opacity="0.4"
            filter="url(#neonBlur)"
          />

          <Wheel
            cx={xLeft + lengthPx * 0.2}
            cy={GROUND_Y - wheelR}
            radius={wheelR}
            tires={design.tires}
          />
          <Wheel
            cx={xLeft + lengthPx * 0.78}
            cy={GROUND_Y - wheelR}
            radius={wheelR}
            tires={design.tires}
          />

          {/* body */}
          <path d={bodyPath} fill="url(#bodyFill)" stroke="#22e5ff" strokeWidth="2.5" />
          <path d={bodyPath} fill="none" stroke="#22e5ff" strokeWidth="3" opacity="0.55" filter="url(#neonBlur)" />

          {/* canopy bubble, clipped to the body */}
          <g clipPath="url(#bodyClip)">
            <ellipse
              cx={xLeft + lengthPx * 0.6}
              cy={yBottom - heightPx * 0.82}
              rx={lengthPx * 0.16}
              ry={heightPx * 0.42}
              fill="url(#canopyFill)"
              opacity="0.9"
            />
            <ellipse
              cx={xLeft + lengthPx * 0.64}
              cy={yBottom - heightPx * 0.95}
              rx={lengthPx * 0.05}
              ry={heightPx * 0.12}
              fill="#ffffff"
              opacity="0.5"
            />
          </g>

          {/* neon accent stripe */}
          <path d={stripePath} fill="none" stroke="url(#stripeStroke)" strokeWidth="2.5" opacity="0.9" />
        </g>

        {/* length dimension */}
        <g stroke="#7df3ff" strokeWidth="1.5" opacity="0.8">
          <line x1={xLeft} y1={GROUND_Y + 30} x2={xLeft + lengthPx} y2={GROUND_Y + 30} />
          <line x1={xLeft} y1={GROUND_Y + 24} x2={xLeft} y2={GROUND_Y + 36} />
          <line x1={xLeft + lengthPx} y1={GROUND_Y + 24} x2={xLeft + lengthPx} y2={GROUND_Y + 36} />
        </g>
        <text
          x={VIEW_W / 2}
          y={GROUND_Y + 50}
          textAnchor="middle"
          fill="#7df3ff"
          fontSize="15"
          fontFamily="ui-monospace, monospace"
        >
          largo {animated.length.toFixed(2)} m
        </text>

        {/* height dimension */}
        <g stroke="#7df3ff" strokeWidth="1.5" opacity="0.8">
          <line
            x1={xLeft + lengthPx + 26}
            y1={yBottom}
            x2={xLeft + lengthPx + 26}
            y2={yBottom - heightPx}
          />
          <line x1={xLeft + lengthPx + 20} y1={yBottom} x2={xLeft + lengthPx + 32} y2={yBottom} />
          <line
            x1={xLeft + lengthPx + 20}
            y1={yBottom - heightPx}
            x2={xLeft + lengthPx + 32}
            y2={yBottom - heightPx}
          />
        </g>
        <text
          x={xLeft + lengthPx + 40}
          y={yBottom - heightPx / 2}
          fill="#7df3ff"
          fontSize="15"
          fontFamily="ui-monospace, monospace"
        >
          {animated.height.toFixed(2)} m
        </text>
      </svg>

      <TopView animated={animated} aeroT={aeroT} />
    </div>
  );
}

const TOP_W = 250;
const TOP_H = 150;
const TOP_SCALE = 62; // px per meter (top view)

function TopView({ animated, aeroT }) {
  const lengthPx = animated.length * TOP_SCALE;
  const widthPx = animated.width * TOP_SCALE;
  const xLeft = (TOP_W - lengthPx) / 2;
  const centerY = TOP_H / 2 - 8;

  const steps = 40;
  const upper = [];
  const lower = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = xLeft + t * lengthPx;
    const half = (widthPx / 2) * topProfile(t, Math.max(aeroT, 0.25));
    upper.push(`${x.toFixed(1)},${(centerY - half).toFixed(1)}`);
    lower.unshift(`${x.toFixed(1)},${(centerY + half).toFixed(1)}`);
  }
  const hullPath = `M ${upper.join(" L ")} L ${lower.join(" L ")} Z`;

  const wheelHalf = (widthPx / 2) * topProfile(0.74, Math.max(aeroT, 0.25)) * 0.78;

  return (
    <div className="absolute right-3 top-3 w-[200px] rounded-xl border border-cyan-400/25 bg-slate-950/80 p-2 backdrop-blur-sm">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">
        Vista superior
      </p>
      <svg viewBox={`0 0 ${TOP_W} ${TOP_H}`} className="w-full">
        <path d={hullPath} fill="#0d1a30" stroke="#22e5ff" strokeWidth="2" />
        {/* two front wheels + one rear wheel: classic prototype layout */}
        <rect x={xLeft + lengthPx * 0.7} y={centerY - wheelHalf - 4} width="16" height="8" rx="3" fill="#22e5ff" opacity="0.85" />
        <rect x={xLeft + lengthPx * 0.7} y={centerY + wheelHalf - 4} width="16" height="8" rx="3" fill="#22e5ff" opacity="0.85" />
        <rect x={xLeft + lengthPx * 0.12} y={centerY - 4} width="16" height="8" rx="3" fill="#22e5ff" opacity="0.85" />

        {/* width dimension */}
        <g stroke="#7df3ff" strokeWidth="1.2" opacity="0.85">
          <line x1={TOP_W - 18} y1={centerY - widthPx / 2} x2={TOP_W - 18} y2={centerY + widthPx / 2} />
          <line x1={TOP_W - 23} y1={centerY - widthPx / 2} x2={TOP_W - 13} y2={centerY - widthPx / 2} />
          <line x1={TOP_W - 23} y1={centerY + widthPx / 2} x2={TOP_W - 13} y2={centerY + widthPx / 2} />
        </g>
        <text
          x={TOP_W - 18}
          y={TOP_H - 6}
          textAnchor="end"
          fill="#7df3ff"
          fontSize="13"
          fontFamily="ui-monospace, monospace"
        >
          ancho {animated.width.toFixed(2)} m
        </text>
      </svg>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LAP_LENGTH_KM,
  MAX_RACE_MINUTES,
  TARGET_LAPS,
  formatRaceTime,
  runSimulation,
  summarizeResult,
} from "../lib/simulation";

const VIEW_W = 860;
const VIEW_H = 560;
const PADDING = 40;
// Sim-seconds per real second: a full 35-minute race plays in 35 s at 60×.
const SPEED_OPTIONS = [30, 60, 120];
const TRAIL_WINDOW_S = 50; // comet trail length in sim-seconds

function fitTrack(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const scale = Math.min(
    (VIEW_W - PADDING * 2) / Math.max(maxX - minX, 1),
    (VIEW_H - PADDING * 2) / Math.max(maxY - minY, 1),
  );
  const offsetX = (VIEW_W - (maxX - minX) * scale) / 2;
  const offsetY = (VIEW_H - (maxY - minY) * scale) / 2;

  // SVG y grows downward, the track y grows northward: flip it.
  return (point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: VIEW_H - offsetY - (point.y - minY) * scale,
  });
}

function interpolateHistory(history, time) {
  if (!history.length) return null;
  if (time <= history[0].time) return history[0];
  const last = history[history.length - 1];
  if (time >= last.time) return last;

  let low = 0;
  let high = history.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (history[mid].time <= time) low = mid;
    else high = mid;
  }
  const a = history[low];
  const b = history[high];
  const span = b.time - a.time;
  const t = span > 0 ? (time - a.time) / span : 0;
  return {
    time,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    speed: a.speed + (b.speed - a.speed) * t,
    distance: a.distance + (b.distance - a.distance) * t,
    heading: a.heading,
  };
}

export default function SimulationPage({ design, onBackToDesign }) {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [simTime, setSimTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(60);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    runSimulation(design)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setStatus("ready");
        setSimTime(0);
        setPlaying(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [design, attempt]);

  const launch = useCallback(() => {
    setStatus("loading");
    setError(null);
    setPlaying(false);
    setAttempt((count) => count + 1);
  }, []);

  const finalTime = result?.final_time ?? 0;

  useEffect(() => {
    if (!playing || !result) return undefined;
    let frame = null;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      setSimTime((time) => {
        const next = time + dt * playSpeed;
        if (next >= finalTime) {
          setPlaying(false);
          return finalTime;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, result, finalTime, playSpeed]);

  const project = useMemo(
    () => (result ? fitTrack(result.track.points) : null),
    [result],
  );

  const trackPath = useMemo(() => {
    if (!result || !project) return "";
    return result.track.points
      .map((point, index) => {
        const { x, y } = project(point);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [result, project]);

  if (status === "loading") {
    return (
      <CenteredPanel>
        <div className="neon-spinner mx-auto h-14 w-14" />
        <p className="mt-4 text-lg font-semibold text-slate-200">
          Llevando tu carro a la pista…
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Corriendo las {TARGET_LAPS} vueltas con la física de tu diseño
        </p>
      </CenteredPanel>
    );
  }

  if (status === "error") {
    return (
      <CenteredPanel>
        <p className="text-4xl">🔌</p>
        <p className="mt-3 text-lg font-semibold text-slate-200">
          No pudimos conectar con el simulador
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{error}</p>
        <div className="mt-5 flex justify-center gap-3">
          <NeonButton onClick={launch}>Reintentar</NeonButton>
          <GhostButton onClick={onBackToDesign}>← Volver al diseño</GhostButton>
        </div>
      </CenteredPanel>
    );
  }

  const car = interpolateHistory(result.history, simTime);
  const carPos = project(car);
  const carAngleDeg = (-car.heading * 180) / Math.PI;
  const finished = simTime >= finalTime;
  const summary = summarizeResult(result);
  const liveEnergyWh = (design.power * car.distance) / 3600;
  const lapLengthM = (result.race?.lap_length ?? LAP_LENGTH_KM * 1000);
  const currentLap = Math.min(
    Math.floor(car.distance / lapLengthM) + 1,
    TARGET_LAPS,
  );

  // Comet-style trail: with 4 overlapping laps a full trail would just
  // repaint the whole circuit, so only the recent stretch is shown.
  const trailPath = result.history
    .filter(
      (point) => point.time <= simTime && point.time >= simTime - TRAIL_WINDOW_S,
    )
    .map((point, index) => {
      const { x, y } = project(point);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_330px]">
      {/* ---- track viewer ---- */}
      <div className="glow-box relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-panel/90">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-black text-white">
              Pista <span className="glow-text text-neon">Shell Eco-marathon</span>
            </h2>
            <p className="text-xs text-slate-500">
              Indianápolis · {TARGET_LAPS} vueltas de {LAP_LENGTH_KM} km · máximo{" "}
              {MAX_RACE_MINUTES} min
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-xs text-slate-500">Velocidad de repetición</span>
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setPlaySpeed(speed)}
                className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                  playSpeed === speed
                    ? "border-neon bg-cyan-400/15 text-neon"
                    : "border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>

        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full">
          <defs>
            <filter id="trackGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          <path d={trackPath} fill="none" stroke="#22e5ff" strokeWidth="8" opacity="0.12" filter="url(#trackGlow)" />
          <path d={trackPath} fill="none" stroke="#1d3a52" strokeWidth="7" strokeLinejoin="round" />
          <path d={trackPath} fill="none" stroke="#22e5ff" strokeWidth="1.5" opacity="0.6" className="track-flow" />

          {/* traveled trail */}
          <path d={trailPath} fill="none" stroke="#b4ff39" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />

          {/* start line */}
          <StartMarker point={project(result.track.points[0])} />

          {/* car */}
          <g transform={`translate(${carPos.x} ${carPos.y}) rotate(${carAngleDeg})`}>
            <circle r="13" fill="#b4ff39" opacity="0.25" filter="url(#trackGlow)" />
            <path d="M 11 0 L -8 -6 L -5 0 L -8 6 Z" fill="#b4ff39" stroke="#04070f" strokeWidth="1" />
          </g>
        </svg>

        {/* playback bar */}
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (finished) {
                setSimTime(0);
                setPlaying(true);
              } else {
                setPlaying((value) => !value);
              }
            }}
            className="glow-box rounded-full border border-neon bg-cyan-400/10 px-4 py-1.5 text-sm font-bold text-neon"
          >
            {finished ? "↺ Repetir" : playing ? "❚❚ Pausa" : "▶ Continuar"}
          </button>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400 transition-[width] duration-100"
              style={{ width: `${finalTime > 0 ? (simTime / finalTime) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-xs text-slate-400">
            {formatRaceTime(simTime)} / {formatRaceTime(finalTime)}
          </span>
          {!finished && (
            <button
              type="button"
              onClick={() => {
                setSimTime(finalTime);
                setPlaying(false);
              }}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-lime-400/50 hover:text-lime-neon"
            >
              ⏭ Ver resultado
            </button>
          )}
        </div>
      </div>

      {/* ---- side panel ---- */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <HudCard
            label="Vuelta"
            value={`${currentLap}`}
            unit={`de ${TARGET_LAPS}`}
          />
          <HudCard label="Velocidad" value={(car.speed * 3.6).toFixed(1)} unit="km/h" />
          <HudCard
            label="Distancia"
            value={(car.distance / 1000).toFixed(2)}
            unit="km"
          />
          <HudCard label="Tiempo" value={formatRaceTime(car.time)} unit="min" />
          <HudCard label="Energía usada" value={liveEnergyWh.toFixed(1)} unit="Wh" />
          <HudCard
            label="Límite"
            value={formatRaceTime(MAX_RACE_MINUTES * 60)}
            unit="min"
          />
        </div>

        {finished ? (
          <ResultsCard
            summary={summary}
            result={result}
            onBackToDesign={onBackToDesign}
            onReplay={() => {
              setSimTime(0);
              setPlaying(true);
            }}
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-panel/80 p-4 text-sm text-slate-400">
            Tu carro debe completar {TARGET_LAPS} vueltas (
            {(TARGET_LAPS * LAP_LENGTH_KM).toFixed(1)} km) en máximo{" "}
            {MAX_RACE_MINUTES} minutos. Al terminar verás qué tan eficiente fue
            en <span className="font-mono text-neon">km/kWh</span>.
          </div>
        )}
      </div>
    </main>
  );
}

function StartMarker({ point }) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <circle r="7" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
      <circle r="2.5" fill="#ffffff" />
      <text x="12" y="4" fill="#ffffff" fontSize="12" fontFamily="ui-monospace, monospace" opacity="0.8">
        SALIDA
      </text>
    </g>
  );
}

function HudCard({ label, value, unit }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel/80 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="glow-text mt-0.5 font-mono text-2xl font-bold text-neon">
        {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

function ResultsCard({ summary, result, onBackToDesign, onReplay }) {
  const forces = result.force_breakdown;
  const dragForce = Math.abs(forces?.aerodynamic_drag ?? 0);
  const rollingForce = Math.abs(forces?.rolling_resistance ?? 0);
  const totalResistance = dragForce + rollingForce;
  const dragShare = totalResistance > 0 ? (dragForce / totalResistance) * 100 : 50;

  return (
    <div className="pop-in space-y-4 rounded-2xl border border-lime-400/40 bg-panel/90 p-5 shadow-[0_0_30px_rgba(180,255,57,0.15)]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Eficiencia de tu carro
        </p>
        <p className="glow-text-lime font-mono text-5xl font-black text-lime-neon">
          {summary.kmPerKwh.toFixed(0)}
          <span className="ml-2 text-lg font-normal text-slate-300">km/kWh</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Los mejores equipos del mundo logran ~500 km/kWh
        </p>
      </div>

      <div
        className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
          summary.isValid
            ? "border-lime-400/40 bg-lime-400/10 text-lime-neon"
            : "border-red-400/40 bg-red-400/10 text-red-300"
        }`}
      >
        {summary.isValid
          ? `✓ Intento válido · ${summary.targetLaps} vueltas en ${formatRaceTime(summary.raceTime)} min`
          : `✗ Intento no válido · solo ${summary.lapsCompleted.toFixed(1)} de ${summary.targetLaps} vueltas en ${MAX_RACE_MINUTES} min`}
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <ResultRow
          label="Vueltas"
          value={`${summary.lapsCompleted.toFixed(summary.isValid ? 0 : 1)} de ${summary.targetLaps}`}
        />
        <ResultRow label="Tiempo" value={`${formatRaceTime(summary.raceTime)} min`} />
        <ResultRow label="Distancia" value={`${summary.distanceKm.toFixed(2)} km`} />
        <ResultRow label="Energía" value={`${summary.energyWh.toFixed(1)} Wh`} />
        <ResultRow label="Vel. promedio" value={`${summary.averageSpeedKmh.toFixed(1)} km/h`} />
        <ResultRow label="Vel. final" value={`${summary.finalSpeedKmh.toFixed(1)} km/h`} />
      </dl>

      {totalResistance > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-slate-400">
            ¿Qué frena a tu carro?
          </p>
          <div className="flex h-3 overflow-hidden rounded-full">
            <div className="bg-cyan-400" style={{ width: `${dragShare}%` }} />
            <div className="bg-fuchsia-400" style={{ width: `${100 - dragShare}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-cyan-300">Aire {dragShare.toFixed(0)}%</span>
            <span className="text-fuchsia-300">Llantas {(100 - dragShare).toFixed(0)}%</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {!summary.isValid
              ? "Tip: tu carro fue demasiado lento. Sube el empuje del motor o reduce lo que lo frena (aire y llantas)."
              : dragShare > 60
                ? "Tip: haz tu carro más angosto, más bajo o con forma de gota para vencer al aire. Así podrás bajar el empuje y gastar menos."
                : dragShare < 40
                  ? "Tip: baja el peso o usa llantas eco para que el piso frene menos. Así podrás bajar el empuje y gastar menos."
                  : "Tip: tu carro está equilibrado. Prueba bajar el empuje del motor para gastar menos energía."}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <NeonButton onClick={onBackToDesign}>🛠 Mejorar diseño</NeonButton>
        <GhostButton onClick={onReplay}>↺ Ver de nuevo</GhostButton>
      </div>
    </div>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-900/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="font-mono text-slate-200">{value}</dd>
    </div>
  );
}

function CenteredPanel({ children }) {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="glow-box mx-auto mt-16 max-w-lg rounded-2xl border border-cyan-400/25 bg-panel/90 p-10 text-center">
        {children}
      </div>
    </main>
  );
}

function NeonButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glow-box flex-1 rounded-lg border border-neon bg-cyan-400/10 px-4 py-2.5 text-sm font-bold text-neon transition-colors hover:bg-cyan-400/20"
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-white"
    >
      {children}
    </button>
  );
}

import CarCanvas from "./CarCanvas";
import { ControlGroup, ParamSlider, SegmentedControl } from "./controls";
import {
  DESIGN_LIMITS,
  LAP_LENGTH_KM,
  MAX_RACE_MINUTES,
  RACE_DISTANCE_KM,
  TARGET_LAPS,
  TIRES,
  estimatePerformance,
} from "../lib/simulation";

export default function DesignPage({ design, onChange, onGoToTrack }) {
  const estimate = estimatePerformance(design);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
      {/* ---- controls ---- */}
      <div className="space-y-4">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <h2 className="text-lg font-black text-white">
            Diseña tu carro <span className="glow-text text-neon">eficiente</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Mueve los controles y mira cómo cambia tu carro. El reto: completar{" "}
            {TARGET_LAPS} vueltas a la pista ({RACE_DISTANCE_KM.toFixed(1)} km)
            en máximo {MAX_RACE_MINUTES} minutos, gastando la menor energía.
          </p>
        </div>

        <ControlGroup title="Tamaño">
          <ParamSlider
            label="Largo"
            name="length"
            value={design.length}
            {...DESIGN_LIMITS.length}
            unit="m"
            format={(v) => v.toFixed(2)}
            hint="Un carro más largo corta mejor el aire"
            onChange={onChange}
          />
          <ParamSlider
            label="Ancho"
            name="width"
            value={design.width}
            {...DESIGN_LIMITS.width}
            unit="m"
            format={(v) => v.toFixed(2)}
            hint="Más angosto = menos aire que empujar"
            onChange={onChange}
          />
          <ParamSlider
            label="Alto"
            name="height"
            value={design.height}
            {...DESIGN_LIMITS.height}
            unit="m"
            format={(v) => v.toFixed(2)}
            hint="Más bajo = menos resistencia del viento"
            onChange={onChange}
          />
        </ControlGroup>

        <ControlGroup title="Carrocería">
          <ParamSlider
            label="Forma aerodinámica"
            name="aero"
            value={design.aero}
            {...DESIGN_LIMITS.aero}
            unit="%"
            hint="0% = caja con ruedas · 100% = gota de agua"
            onChange={onChange}
          />
          <ParamSlider
            label="Peso total (carro + piloto)"
            name="mass"
            value={design.mass}
            {...DESIGN_LIMITS.mass}
            unit="kg"
            hint="Menos peso = las llantas frenan menos al carro"
            onChange={onChange}
          />
        </ControlGroup>

        <ControlGroup title="Motor y estrategia">
          <ParamSlider
            label="Empuje del motor"
            name="power"
            value={design.power}
            {...DESIGN_LIMITS.power}
            unit="N"
            hint="La fuerza de cada acelerón. Debe alcanzar para vencer al aire y a las llantas"
            onChange={onChange}
          />
          <ParamSlider
            label="Velocidad objetivo"
            name="cruise"
            value={design.cruise}
            {...DESIGN_LIMITS.cruise}
            unit="km/h"
            hint={`Tu piloto acelera y luego planea alrededor de esta velocidad. Más rápido = terminas antes, pero el aire te cobra al cuadrado. Recuerda: ${TARGET_LAPS} vueltas de ${LAP_LENGTH_KM} km en ${MAX_RACE_MINUTES} min`}
            onChange={onChange}
          />
        </ControlGroup>

        <ControlGroup title="Llantas y clima">
          <SegmentedControl
            label="Tipo de llanta"
            name="tires"
            value={design.tires}
            options={Object.entries(TIRES).map(([value, tire]) => ({
              value,
              label: tire.label,
            }))}
            hint={TIRES[design.tires].hint}
            onChange={onChange}
          />
          <SegmentedControl
            label="Clima del día"
            name="weather"
            value={design.weather}
            options={[
              { value: "sunny", label: "Soleado", icon: "☀️" },
              { value: "rainy", label: "Lluvioso", icon: "🌧️" },
            ]}
            hint={
              design.weather === "rainy"
                ? "Con lluvia el piso frena más tu carro, sobre todo con llantas eco"
                : "Día perfecto para romper récords"
            }
            onChange={onChange}
          />
        </ControlGroup>
      </div>

      {/* ---- live preview ---- */}
      <div className="space-y-4">
        <div className="glow-box rounded-2xl border border-cyan-400/25 bg-panel/90 p-4">
          <CarCanvas design={design} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <EstimateCard
            label="Eficiencia estimada"
            value={estimate.kmPerKwh.toFixed(0)}
            unit="km/kWh"
            tone="lime"
            note="Solo cuenta si terminas las 4 vueltas a tiempo"
          />
          <EstimateCard
            label="Tiempo de carrera"
            value={
              Number.isFinite(estimate.raceMinutes)
                ? estimate.raceMinutes.toFixed(0)
                : "∞"
            }
            unit="min"
            tone="cyan"
            note={
              estimate.likelyValid
                ? `Dentro del límite de ${MAX_RACE_MINUTES} min`
                : `⚠️ Fuera del límite de ${MAX_RACE_MINUTES} min`
            }
          />
          <EstimateCard
            label="Velocidad máxima"
            value={estimate.topSpeedKmh.toFixed(0)}
            unit="km/h"
            tone="cyan"
            note={
              estimate.canCruise
                ? `Alcanza tu objetivo de ${design.cruise} km/h`
                : "⚠️ No alcanza tu velocidad objetivo"
            }
          />
          <EstimateCard
            label="Resistencia del aire"
            value={(estimate.physics.dragCoefficient * estimate.physics.frontalArea).toFixed(2)}
            unit="Cd·A"
            tone="cyan"
            note="Entre más bajo, mejor"
          />
        </div>

        <button
          type="button"
          onClick={onGoToTrack}
          className="glow-box w-full rounded-xl border border-neon bg-cyan-400/10 px-6 py-4 text-lg font-black uppercase tracking-wider text-neon transition-all duration-200 hover:bg-cyan-400/20 hover:shadow-[0_0_30px_rgba(34,229,255,0.4)]"
        >
          Probar en la pista →
        </button>
      </div>
    </main>
  );
}

function EstimateCard({ label, value, unit, note, tone }) {
  const valueClass =
    tone === "lime" ? "glow-text-lime text-lime-neon" : "glow-text text-neon";
  return (
    <div className="rounded-xl border border-white/10 bg-panel/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-bold ${valueClass}`}>
        {value} <span className="text-base font-normal">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

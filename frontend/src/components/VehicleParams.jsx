export default function VehicleParams({ params, onChange }) {
  return (
    <section className="mx-auto max-w-3xl p-6">
      <h2 className="mb-6 text-2xl font-bold text-white">
        Vehicle Parameters
      </h2>

      <div className="space-y-5 rounded-lg border border-white/10 bg-slate-950 p-6">
        <ParamSlider
          label="Mass"
          name="mass"
          value={params.mass}
          min="600"
          max="1800"
          step="10"
          unit="kg"
          onChange={onChange}
        />

        <ParamSlider
          label="Drive Force"
          name="driveForce"
          value={params.driveForce}
          min="1000"
          max="9000"
          step="50"
          unit="N"
          onChange={onChange}
        />
      </div>
    </section>
  );
}

function ParamSlider({ label, name, value, min, max, step, unit, onChange }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-slate-200">{label}</span>
        <span className="font-mono text-cyan-300">
          {value} {unit}
        </span>
      </div>

      <input
        type="range"
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="w-full accent-cyan-400"
      />
    </label>
  );
}
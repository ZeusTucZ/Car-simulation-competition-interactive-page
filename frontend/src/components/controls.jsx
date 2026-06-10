export function ParamSlider({ label, name, value, min, max, step, unit, hint, format, onChange }) {
  const fill = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : value;

  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span className="glow-text font-mono text-sm text-neon">
          {display} {unit}
        </span>
      </div>
      <input
        type="range"
        className="neon-range"
        style={{ "--fill": `${fill}%` }}
        name={name}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(name, Number(event.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </label>
  );
}

export function SegmentedControl({ label, name, value, options, hint, onChange }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-slate-200">{label}</span>
      <div className="flex gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(name, option.value)}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "glow-box border-neon bg-cyan-400/10 text-neon"
                  : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-cyan-400/40 hover:text-slate-200"
              }`}
            >
              {option.icon && <span className="mr-1">{option.icon}</span>}
              {option.label}
            </button>
          );
        })}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ControlGroup({ title, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-panel/80 p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">{title}</h3>
      {children}
    </section>
  );
}

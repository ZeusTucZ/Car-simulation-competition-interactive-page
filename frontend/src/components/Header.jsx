import ElyosLogoBlanco from "../assets/ElyosLogoBlanco.avif";

const TABS = [
  { id: "design", label: "1 · Diseña tu carro" },
  { id: "track", label: "2 · Corre en la pista" },
];

export default function Header({ page, onNavigate }) {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/20 bg-slate-950/85 px-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 py-3">
        <h1 className="text-xl font-black text-white">
          Silka Elyos <span className="glow-text text-neon">Simulator</span>
        </h1>

        <nav className="flex gap-1 rounded-full border border-white/10 bg-slate-900/70 p-1">
          {TABS.map((tab) => {
            const active = page === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "glow-box bg-cyan-400/15 text-neon"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <img
          src={ElyosLogoBlanco}
          alt="Logo de Elyos Racing Team"
          className="h-9 w-auto"
        />
      </div>
    </header>
  );
}

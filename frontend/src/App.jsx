import { useState } from "react";
import Header from "./components/Header";
import DesignPage from "./components/DesignPage";
import SimulationPage from "./components/SimulationPage";
import { DEFAULT_DESIGN } from "./lib/simulation";

export default function App() {
  const [page, setPage] = useState("design");
  const [design, setDesign] = useState(DEFAULT_DESIGN);

  function handleDesignChange(name, value) {
    setDesign((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="min-h-screen text-white">
      <Header page={page} onNavigate={setPage} />
      {page === "design" ? (
        <DesignPage
          design={design}
          onChange={handleDesignChange}
          onGoToTrack={() => setPage("track")}
        />
      ) : (
        <SimulationPage design={design} onBackToDesign={() => setPage("design")} />
      )}
    </div>
  );
}

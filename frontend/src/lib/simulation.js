// Maps the friendly design controls to the physics parameters that the
// FastAPI backend expects, and provides live estimates for the design page.

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export const GRAVITY = 9.81; // m/s^2
export const AIR_DENSITY = 1.225; // kg/m^3

// Shell Eco-marathon rule: the attempt only counts if the car keeps a
// minimum average speed, so saving energy by going too slow is invalid.
export const MIN_AVERAGE_SPEED_KMH = 25;

export const DESIGN_LIMITS = {
  length: { min: 2.2, max: 3.5, step: 0.05 },
  width: { min: 0.55, max: 1.3, step: 0.05 },
  height: { min: 0.5, max: 1.1, step: 0.05 },
  mass: { min: 60, max: 200, step: 5 },
  power: { min: 10, max: 150, step: 5 },
  aero: { min: 0, max: 100, step: 1 },
};

export const DEFAULT_DESIGN = {
  length: 2.8, // m
  width: 0.8, // m
  height: 0.7, // m
  mass: 95, // kg (car + driver)
  power: 60, // N of drive force
  aero: 70, // 0 = box, 100 = water drop
  tires: "eco", // eco | standard | rain
  weather: "sunny", // sunny | rainy
};

export const TIRES = {
  eco: { label: "Eco", crr: 0.0028, hint: "Muy poca fricción, pero resbalan con lluvia" },
  standard: { label: "Normales", crr: 0.0055, hint: "Equilibradas en todo clima" },
  rain: { label: "Lluvia", crr: 0.008, hint: "Más fricción, pero casi no les afecta el agua" },
};

const RAIN_PENALTY = { eco: 1.7, standard: 1.45, rain: 1.12 };

export function derivePhysics(design) {
  const aeroT = design.aero / 100;
  const { min, max } = DESIGN_LIMITS.length;
  const slenderness = (design.length - min) / (max - min);

  // A teardrop body and a longer, slimmer profile lower the drag coefficient.
  const dragCoefficient = (0.45 - 0.33 * aeroT) * (1.06 - 0.12 * slenderness);
  const frontalArea = design.width * design.height * 0.82;

  let rollingResistance = TIRES[design.tires].crr;
  if (design.weather === "rainy") {
    rollingResistance *= RAIN_PENALTY[design.tires];
  }

  return {
    mass: design.mass,
    driveForce: design.power,
    dragCoefficient,
    frontalArea,
    rollingResistance,
  };
}

export function estimatePerformance(design) {
  const physics = derivePhysics(design);
  const rollingForce = physics.rollingResistance * physics.mass * GRAVITY;
  const dragFactor =
    0.5 * AIR_DENSITY * physics.dragCoefficient * physics.frontalArea;
  const surplus = physics.driveForce - rollingForce;
  const topSpeedMs = surplus > 0 ? Math.sqrt(surplus / dragFactor) : 0;
  const kmPerKwh = physics.driveForce > 0 ? 3600 / physics.driveForce : 0;

  return {
    physics,
    topSpeedKmh: topSpeedMs * 3.6,
    kmPerKwh,
    likelyValid: topSpeedMs * 3.6 > MIN_AVERAGE_SPEED_KMH * 1.15,
  };
}

export async function runSimulation(design) {
  const physics = derivePhysics(design);
  const response = await fetch(`${API_URL}/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mass: physics.mass,
      drive_force: physics.driveForce,
      drag_coefficient: physics.dragCoefficient,
      frontal_area: physics.frontalArea,
      rolling_resistance_coefficient: physics.rollingResistance,
      initial_velocity: 0,
      track_id: "centerline",
      line_type: "centerline",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`El simulador respondió ${response.status}. ${detail}`);
  }

  return response.json();
}

export function summarizeResult(result) {
  const distanceKm = result.distance_traveled / 1000;
  const energyKwh = result.energy_used / 3_600_000;
  const averageSpeedKmh =
    result.final_time > 0
      ? (result.distance_traveled / result.final_time) * 3.6
      : 0;

  return {
    distanceKm,
    energyWh: energyKwh * 1000,
    kmPerKwh: energyKwh > 0 ? distanceKm / energyKwh : 0,
    averageSpeedKmh,
    finalSpeedKmh: result.final_speed * 3.6,
    isValid: averageSpeedKmh >= MIN_AVERAGE_SPEED_KMH,
  };
}

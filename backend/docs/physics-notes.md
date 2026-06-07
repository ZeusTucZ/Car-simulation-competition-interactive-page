# Digital Simulation Backend

## Forces

The following forces act on the car and are included in the current simulation.

### Forces Acting on the Car

- **Driving force**: The force from the engine or motor through the wheels. This moves the car forward.
  - Formula: `F_drive`

- **Aerodynamic drag**: Air resistance. It gets much stronger at higher speed.
  - Formula: `F_drag = 0.5 * airDensity * Cd * frontalArea * velocity^2`

- **Rolling resistance**: Energy lost because the tires deform while rolling.
  - Formula: `F_roll = Crr * mass * gravity`

- **Gravity/slope force**: If the car goes uphill, gravity pulls it backward. If it goes downhill, gravity helps it.
  - Formula: `F_slope = mass * gravity * sin(roadAngle)`


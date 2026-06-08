
# Environment constants
STANDARD_GRAVITY = 9.81                 # m/s^2
AIR_DENSITY_SEA_LEVEL = 1.225           # kg/m^3

# Simulation defaults
DEFAULT_INITIAL_POSITION = 0.0          # meters
DEFAULT_INITIAL_VELOCITY = 0.0          # m/s
DEFAULT_ROAD_ANGLE = 0.0                # radians
DEFAULT_TIME_STEP = 0.05                # seconds
DEFAULT_SIMULATION_DURATION = 30.0      # seconds

# Race defaults
DEFAULT_TRACK_DISTANCE = 1000.0         # meters
MAX_SIMULATION_TIME = 120.0             # seconds

# Physical limits
MIN_MASS = 0.001                        # kg, avoids division by zero
MIN_TIME_STEP = 0.001                   # seconds
MIN_VELOCITY = 0.0                      # m/s
MIN_DRIVE_FORCE = 0.0                   # newtons
MIN_DISTANCE = 0.0                      # meters
MIN_ENERGY = 0.0                        # joules

# Formula coefficients
DRAG_EQUATION_FACTOR = 0.5
KINETIC_ENERGY_FACTOR = 0.5

# Unit conversions for UI results
JOULES_PER_KWH = 3_600_000.0
METERS_PER_KILOMETER = 1000.0
SECONDS_PER_HOUR = 3600.0
PERCENT_MULTIPLIER = 100.0
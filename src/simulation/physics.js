const GRAVITY = 1.0;

// Magnetic force required to approximately
// balance gravity around the operating point.
const BASE_MAGNETIC_FORCE = 1.0;

const DAMPING = 0.94;

const MIN_DISTANCE = 20;
const MAX_DISTANCE = 70;

export function calculatePhysics({
  distance,
  velocity,
  pwm,
  dt,
}) {
  /*
    Distance:
      smaller = globe closer to electromagnet
      larger  = globe farther from electromagnet

    Gravity -> pushes globe downward
    Magnet  -> pulls globe upward
  */

  const normalizedPwm = pwm / 100;

  /*
    Magnetic force.

    Around the nominal PWM (~23.5%),
    magnetic force is approximately equal
    to gravity.

    This creates an equilibrium region.
  */

  const magneticForce =
    BASE_MAGNETIC_FORCE *
    (normalizedPwm / 0.235);

  /*
    Small distance dependency.

    When globe gets closer to magnet,
    magnetic attraction becomes slightly stronger.

    This gives the system more realistic
    nonlinear behavior.
  */

  const distanceFactor =
    1 +
    (40 - distance) * 0.008;

  const finalMagneticForce =
    magneticForce * distanceFactor;

  /*
    Net force.

    Positive -> upward
    Negative -> downward
  */

  const netForce =
    finalMagneticForce - GRAVITY;

  /*
    Acceleration.
  */

  let acceleration = netForce;

  /*
    Prevent simulation from exploding.
  */

  acceleration = Math.max(
    -8,
    Math.min(8, acceleration)
  );

  /*
    Velocity update.
  */

  let newVelocity =
    velocity + acceleration * dt;

  /*
    Damping.

    This is what makes the globe
    gradually settle instead of
    continuously oscillating.
  */

  newVelocity *= DAMPING;

  /*
    Position update.

    Upward movement:
      distance decreases

    Downward movement:
      distance increases
  */

  let newDistance =
    distance - newVelocity * dt;

  /*
    Boundaries.
  */

  if (newDistance < MIN_DISTANCE) {
    newDistance = MIN_DISTANCE;

    newVelocity =
      Math.abs(newVelocity) * 0.2;
  }

  if (newDistance > MAX_DISTANCE) {
    newDistance = MAX_DISTANCE;

    newVelocity =
      -Math.abs(newVelocity) * 0.2;
  }

  return {
    distance: newDistance,

    velocity: newVelocity,

    acceleration,

    magneticAcceleration:
      finalMagneticForce,

    gravityAcceleration:
      GRAVITY,
  };
}
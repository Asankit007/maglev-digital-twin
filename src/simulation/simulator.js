import { PIDController } from "./pid";
import { simulateSensor } from "./sensor";
import { calculatePhysics } from "./physics";

export class MagLevSimulator {
  constructor() {
    this.distance = 40;
    this.velocity = 0;

    this.setpoint = 40;

    this.noiseLevel = 0.15;

    this.pid = new PIDController(
      1.8,
      0.08,
      0.45
    );

    this.lastTelemetry = this.createTelemetry();
  }

  createTelemetry() {
    return {
      distance: 40,
      sensor: 40,
      setpoint: 40,

      error: 0,

      pTerm: 0,
      iTerm: 0,
      dTerm: 0,

      pidOutput: 0,

      pwm: 23.5,

      velocity: 0,
      acceleration: 0,

      magneticForce: 1,
      gravityForce: 1,
    };
  }

  step(dt = 0.02) {

    // ==========================================
    // 1. SENSOR
    // ==========================================

    const sensorValue = simulateSensor(
      this.distance,
      this.noiseLevel
    );

    // ==========================================
    // 2. PID
    // ==========================================

    const pidResult = this.pid.update(
      this.setpoint,
      sensorValue,
      dt
    );

    /*
      IMPORTANT:

      Our physical actuator has this direction:

      More PWM
          ↓
      More magnetic force
          ↓
      Globe moves UP
          ↓
      Distance decreases

      Therefore conventional PID output
      must be SUBTRACTED from base PWM.

      If:
        distance > setpoint
        globe is too far down
        PID output becomes negative
        subtract negative = increase PWM
        globe moves UP

      If:
        distance < setpoint
        globe is too high
        PID output becomes positive
        subtract positive = decrease PWM
        globe moves DOWN
    */

    const BASE_PWM = 23.5;

    let pwm =
      BASE_PWM - pidResult.output;

    // ==========================================
    // PWM LIMIT
    // ==========================================

    pwm = Math.max(
      0,
      Math.min(100, pwm)
    );

    // ==========================================
    // 3. PHYSICS
    // ==========================================

    const physics =
      calculatePhysics({
        distance: this.distance,
        velocity: this.velocity,
        pwm,
        dt,
      });

    // ==========================================
    // 4. UPDATE POSITION
    // ==========================================

    this.distance =
      physics.distance;

    this.velocity =
      physics.velocity;

    // ==========================================
    // 5. TELEMETRY
    // ==========================================

    this.lastTelemetry = {
      distance: this.distance,

      sensor: sensorValue,

      setpoint: this.setpoint,

      error: pidResult.error,

      pTerm: pidResult.pTerm,

      iTerm: pidResult.iTerm,

      dTerm: pidResult.dTerm,

      pidOutput: pidResult.output,

      pwm,

      velocity: this.velocity,

      acceleration:
        physics.acceleration,

      magneticForce:
        physics.magneticAcceleration,

      gravityForce:
        physics.gravityAcceleration,
    };

    return this.lastTelemetry;
  }

  // ==========================================
  // SETPOINT
  // ==========================================

  setSetpoint(value) {
    this.setpoint = Number(value);

    /*
      Clear old integral memory.

      Otherwise changing 40 → 41 → 48
      can carry old accumulated error.
    */

    this.pid.reset();

    this.velocity *= 0.3;
  }

  // ==========================================
  // PID
  // ==========================================

  setPID(kp, ki, kd) {
    this.pid.setTunings(
      Number(kp),
      Number(ki),
      Number(kd)
    );

    this.pid.reset();
  }

  // ==========================================
  // SENSOR NOISE
  // ==========================================

  setNoise(value) {
    this.noiseLevel =
      Number(value);
  }

  // ==========================================
  // DISTURBANCE
  // ==========================================

  disturb(amount) {

    this.distance += amount;

    this.distance =
      Math.max(
        20,
        Math.min(70, this.distance)
      );

    /*
      Give globe some physical movement.
    */

    this.velocity +=
      amount * 0.8;
  }

  // ==========================================
  // RESET
  // ==========================================

  reset() {

    this.distance = 40;

    this.velocity = 0;

    this.setpoint = 40;

    this.pid.reset();

    this.lastTelemetry =
      this.createTelemetry();

    this.lastTelemetry.setpoint =
      this.setpoint;
  }
}
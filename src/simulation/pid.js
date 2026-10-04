export class PIDController {
  constructor(
    kp = 1.8,
    ki = 0.08,
    kd = 0.45
  ) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;

    this.integral = 0;
    this.previousError = 0;

    this.initialized = false;
  }

  update(
    setpoint,
    measurement,
    dt
  ) {

    /*
      Conventional PID error:

      error = target - actual
    */

    const error =
      setpoint - measurement;

    // ======================================
    // P
    // ======================================

    const pTerm =
      this.kp * error;

    // ======================================
    // I
    // ======================================

    this.integral +=
      error * dt;

    /*
      Small anti-windup limit.
    */

    this.integral =
      Math.max(
        -25,
        Math.min(25, this.integral)
      );

    const iTerm =
      this.ki * this.integral;

    // ======================================
    // D
    // ======================================

    let derivative = 0;

    if (
      this.initialized &&
      dt > 0
    ) {
      derivative =
        (error -
          this.previousError) /
        dt;
    }

    /*
      Limit derivative spikes
      caused by sensor noise.
    */

    derivative =
      Math.max(
        -20,
        Math.min(20, derivative)
      );

    const dTerm =
      this.kd * derivative;

    // ======================================
    // TOTAL
    // ======================================

    const output =
      pTerm +
      iTerm +
      dTerm;

    this.previousError =
      error;

    this.initialized =
      true;

    return {
      error,
      pTerm,
      iTerm,
      dTerm,
      output,
    };
  }

  reset() {

    this.integral = 0;

    this.previousError = 0;

    this.initialized = false;
  }

  setTunings(
    kp,
    ki,
    kd
  ) {

    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }
}
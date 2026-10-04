export function simulateSensor(
  distance,
  noiseLevel = 0.15
) {
  const noise =
    (Math.random() - 0.5) *
    2 *
    noiseLevel;

  return distance + noise;
}
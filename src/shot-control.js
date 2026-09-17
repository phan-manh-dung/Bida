// One shared travel distance for pointer input and the drawn cue's visual position.
export function pullTravel(height) { return height * 0.45; }
export function pullPower(distance, travel) {
  return Math.min(1, Math.max(0, distance / Math.max(1, travel)));
}

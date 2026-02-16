function expandSteps(min, max, leastCount) {
  // Ensure numeric values
  if (
    min == null ||
    max == null ||
    leastCount == null ||
    isNaN(min) ||
    isNaN(max) ||
    isNaN(leastCount) ||
    leastCount <= 0
  ) {
    return []; // no steps possible
  }

  const steps = [];
  for (let val = Number(min); val <= Number(max); val += Number(leastCount)) {
    steps.push(val.toFixed(1)); // round to 2 decimals
  }

  return steps;
}
module.exports = {
  expandSteps,
};

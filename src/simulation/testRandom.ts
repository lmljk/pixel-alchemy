export function sequenceRandom(values: readonly number[]): () => number {
  if (values.length === 0) return () => 0;

  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

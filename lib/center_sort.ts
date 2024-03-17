/**
 * This is a method that takes an array and changes the order
 * so that the elements in the middle of the array and then
 * the surrounding elements come one after another until
 * finally the first and last elements in the original order.
 *
 * Why? Because I'd like to try and put labels
 * in the center first.
 */
export function centerSort<T>(array: T[]) {
  const centerIndex = Math.floor(array.length / 2);

  const left = array.slice(0, centerIndex);
  const right = array.slice(centerIndex).reverse();

  const output: T[] = [];

  while (left.length || right.length) {
    if (right.length) {
      output.unshift(right.shift()!);
    }
    if (left.length) {
      output.unshift(left.shift()!);
    }
  }

  return output;
}

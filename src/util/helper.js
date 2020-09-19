import * as d3 from "d3v4";

/**
 * Create a 1-dimensional array of size 'length', where the 'i'th entry
 * is initialized to 'f(i)', or 'undefined' if 'f' is not passed.
 */
function array1d(length, f) {
  return Array.from({ length: length }, f ? (v, i) => f(i) : undefined);
}

/**
 * Create a 2-dimensional array of size 'height' x 'width', where the 'i','j' entry
 * is initialized to 'f(i, j)', or 'undefined' if 'f' is not passed.
 */
function array2d(height, width, f) {
  return Array.from({ length: height }, (v, i) =>
    Array.from({ length: width }, f ? (w, j) => f(i, j) : undefined)
  );
}

/**
 * The classic convolution output size formula.
 *
 * The derivation for many special cases is worked out in:
 * http://deeplearning.net/software/theano/tutorial/conv_arithmetic.html
 */
function computeOutputSize(input_size, weight_size, padding, dilation, stride) {
  return Math.floor(
    (input_size + 2 * padding - dilation * (weight_size - 1) - 1) / stride + 1
  );
}

/**
 * Test if a set of parameters is valid.
 */
function paramsOK(input_size, weight_size, padding, dilation, stride) {
  return (
    computeOutputSize(input_size, weight_size, padding, dilation, stride) > 0
  );
}

// We use the next two functions (maxWhile and minWhile) to
// inefficiently compute the bounds for various parameters
// given fixed values for other parameters.

/**
 * Given a predicate 'pred' and a starting integer 'start',
 * find the largest integer i >= start such that 'pred(i)'
 * is true OR end, whichever is smaller.
 */
function maxWhile(start, end, pred) {
  for (let i = start; i <= end; i++) {
    if (pred(i)) continue;
    return i - 1;
  }
  return end;
}

/**
 * Given a predicate 'pred' and a starting integer 'start',
 * find the smallest integer i <= start such that 'pred(i)'
 * is true OR end, whichever is larger.
 */
function minWhile(start, end, pred) {
  for (let i = start; i >= end; i--) {
    if (pred(i)) continue;
    return i + 1;
  }
  return end;
}

/**
 * Return the color at 0 <= p <= 1 for the RGB linear interpolation
 * between color (0) and white (1).
 */
function whiten(color, p) {
  return d3.interpolateRgb(color, "white")(p);
}

export {
  array1d,
  array2d,
  computeOutputSize,
  paramsOK,
  maxWhile,
  minWhile,
  whiten,
};

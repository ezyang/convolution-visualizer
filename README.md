## Convolution Visualizer

Live at [Convolution Visualizer](https://ezyang.github.io/convolution-visualizer/index.html).

Made with the help of our fine friends at [React](https://reactjs.org/)
and [D3.js](https://d3js.org/).

### Things to do

Want to play around with the code?  Clone this repository and run `yarn
start` to start a development instance.  The main code lives in
`src/index.js`.  This [React manual](https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md) may be of interest.

Here are some project ideas:

* Tweak the CSS so that the weight and output matrices
  are displayed to the right of the input if there is space.
* Add a slider for adjusting speed of the animation.
* Add a slider which specifies the animation timestep you
  are on; this way, you can run the animation forward and
  backward by dragging the slider.
* Add output size and output padding sliders.  When these
  sliders are adjusted, you recompute the input size using
  the transposed convolution formula.
* Add an onClick handler, which pins your selection at
  the current mouse collection until another click
  occurs (disabling the hover behavior.)
* Add a mode which, when enabled, labels cells with variables and
  renders the mathematical formula to compute the output
  cell you are moused over.
* Render code for PyTorch (or your favorite framework) which performs the
  selected convolution.
* Add more exotic convolution types like circular convolution.
* Add a "true" convolution mode, where the weights are flipped
  before multiplication.
* Support bigger input sizes than 16 (decreasing the size of
  the squares when inputs are large), and optimize the code so that it
  still runs quickly in these cases.
* Support assymmetric inputs/kernels/strides/dilations.

Bigger projects:

* Create an in-browser canvas application, which convolves
  an input image against a displayed filter.  Bonus points
  if your canvas supports painting capabilities.
* Design a visualization which demonstrates the principles
  of group convolution, allowing you to slide from standard
  to depthwise convolution.

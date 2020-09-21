import React from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3v4';
import './index.css';

/**
 * An HTML5 range slider and associated raw text input.
 *
 * Properties:
 *    - min: The minimum allowed value for the slider range
 *    - max: The maximum allowed value for the slider range
 *    - value: The current value of the slider
 *    - disabled: Whether or not to disable the slider.  A slider
 *      is automatically disabled when min == max.
 *    - onChange: Callback when the value of this slider changes.
 */
function Slider(props) {
  const max = parseInt(props.max, 10);
  const min = parseInt(props.min, 10);
  const maxLength = max ? Math.ceil(Math.log10(max)) : 1;
  const disabled = props.disabled || min >= max;
  return (
    <span className="slider">
      <input type="range" min={min} max={max} value={props.value}
        onChange={props.onChange}
        disabled={disabled}
        />
      <input type="text" value={props.value}
        onChange={props.onChange}
        maxLength={maxLength}
        disabled={disabled}
        size={Math.max(maxLength, 2)}
        />
    </span>
  );
}

/**
 * Create a 1-dimensional array of size 'length', where the 'i'th entry
 * is initialized to 'f(i)', or 'undefined' if 'f' is not passed.
 */
function array1d(length, f) {
  return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
}

/**
 * Create a 2-dimensional array of size 'height' x 'width', where the 'i','j' entry
 * is initialized to 'f(i, j)', or 'undefined' if 'f' is not passed.
 */
function array2d(height, width, f) {
  return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
}

/**
 * The classic convolution output size formula.
 *
 * The derivation for many special cases is worked out in:
 * http://deeplearning.net/software/theano/tutorial/conv_arithmetic.html
 */
function computeOutputSize(input_size, weight_size, padding, dilation, stride) {
  return Math.floor((input_size + 2 * padding - dilation * (weight_size - 1) - 1) / stride + 1);
}

/**
 * Test if a set of parameters is valid.
 */
function paramsOK(input_size, weight_size, padding, dilation, stride) {
  return computeOutputSize(input_size, weight_size, padding, dilation, stride) > 0;
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
  return d3.interpolateRgb(color, "white")(p)
}

/**
 * Top-level component for the entire visualization.  This component
 * controls top level parameters like input sizes, but not the mouse
 * interaction with the actual visualized grids.
 */
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      input_size: 5,
      weight_size: 3,
      padding: 0,
      dilation: 1,
      stride: 1,
    };
  }

  // React controlled components clobber saved browser state, so
  // instead we manually save/load our state from localStorage.

  componentDidMount() {
    const state = localStorage.getItem("state");
    if (state) {
      this.setState(JSON.parse(state));
    }
  }

  componentDidUpdate() {
    localStorage.setItem("state", JSON.stringify(this.state));
  }

  render() {
    const input_size = this.state.input_size;
    const weight_size = this.state.weight_size;
    const padding = this.state.padding;
    const dilation = this.state.dilation;
    const stride = this.state.stride;
    const padded_input_size = input_size + padding * 2;

    // TODO: transposed convolution

    const output_size = computeOutputSize(input_size, weight_size, padding, dilation, stride);

    // Compute the convolution symbolically.

    // output[output_height][output_width] =
    //    symbolic expression s for this cell, where
    //    s[kernel_height][kernel_width] =
    //      the flat input index multiplied against this kernel entry
    //      (undefined if this entry not used)
    //
    // Recall: the flat input index for (i, j) in a square matrix is 'i * size + j'
    const output = array2d(output_size, output_size, (i, j) => array2d(weight_size, weight_size));

    for (let h_out = 0; h_out < output_size; h_out++) {
      for (let w_out = 0; w_out < output_size; w_out++) {
        for (let h_kern = 0; h_kern < weight_size; h_kern++) {
          for (let w_kern = 0; w_kern < weight_size; w_kern++) {
            // NB: We purposely don't apply padding here, this is
            // handled at render time.
            const h_im = h_out * stride + h_kern * dilation;
            const w_im = w_out * stride + w_kern * dilation;
            output[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
          }
        }
      }
    }

    // Make an extended params dictionary with our new computed values
    // to pass to the inner component.
    const params = Object.assign({
      padded_input_size: padded_input_size,
      output_size: output_size,
      output: output,
    }, this.state);

    const onChange = (state_key) => {
      return (e) => {
        const r = parseInt(e.target.value, 10);
        // Text inputs can sometimes temporarily be in invalid states.
        // If it's not a valid number, refuse to set it.
        if (!isNaN(r)) {
          this.setState({[state_key]: r});
        }
      };
    };

    // An arbitrary constant I found aesthetically pleasing.
    const max_input_size = 16;

    return (
      <div>
        <h1>Convolution Visualizer</h1>
        <div className="author">Edward Z. Yang</div>
        <p>
          This interactive visualization demonstrates how various convolution parameters
          affect shapes and data dependencies between the input, weight and
          output matrices.  Hovering over an input/output will highlight the
          corresponding output/input, while hovering over an weight
          will highlight which inputs were multiplied into that weight to
          compute an output.  (Strictly speaking, the operation visualized
          here is a <em>correlation</em>, not a convolution, as a true
          convolution flips its weights before performing a correlation.
          However, most deep learning frameworks still call these convolutions,
          and in the end it's all the same to gradient descent.)
        </p>
        <form className="form">
          <fieldset>
            <legend>Input size:</legend>
            <Slider min={minWhile(max_input_size, 1, (x) => paramsOK(x, weight_size, padding, dilation, stride))}
                    max={max_input_size}
                    value={input_size}
                    onChange={onChange("input_size")}
                    />
          </fieldset>
          <fieldset>
            <legend>Kernel size:</legend>
            <Slider min="1"
                    max={maxWhile(1, 100, (x) => paramsOK(input_size, x, padding, dilation, stride))}
                    value={weight_size}
                    onChange={onChange("weight_size")}
                    />
          </fieldset>
          <fieldset>
            <legend>Padding:</legend>
            <Slider min={minWhile(dilation*(weight_size-1), 0,
                                  (x) => paramsOK(input_size, weight_size, x, dilation, stride))}
                    max={dilation*(weight_size-1)}
                    value={padding}
                    onChange={onChange("padding")}
                    />
          </fieldset>
          <fieldset>
            <legend>Dilation:</legend>
            <Slider min="1"
                    max={maxWhile(1, 100, (x) => paramsOK(input_size, weight_size, padding, x, stride))}
                    value={dilation}
                    onChange={onChange("dilation")}
                    disabled={weight_size === 1}
                    />
          </fieldset>
          <fieldset>
            <legend>Stride:</legend>
            <Slider min="1"
                    max={Math.max(input_size-dilation*(weight_size-1), 1)}
                    value={stride}
                    onChange={onChange("stride")}
                    />
          </fieldset>
        </form>
        <Viewport {...params} />
      </div>
    );
  }
}

/**
 * The viewport into the actual meat of the visualization, the
 * matrices.  This component controls the state for hovering
 * and the animation.
 */
class Viewport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Which matrix are we hovering over?
      hoverOver: undefined,
      // Which coordinate are we hovering over?  Origin
      // is the top-left corner.
      hoverH: undefined,
      hoverW: undefined,
      // What is our animation timestep?  A monotonically
      // increasing integer.
      counter: 0
    };
  }

  // Arrange for counter to increment by one after a fixed
  // time interval:

  tick() {
    this.setState({counter: this.state.counter + 1});
  }
  componentDidMount() {
    this.interval = setInterval(this.tick.bind(this), 1000);  // 1 second
  }
  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const input_size = this.props.input_size;
    const padded_input_size = this.props.padded_input_size;
    const weight_size = this.props.weight_size;
    const output_size = this.props.output_size;
    const output = this.props.output;
    const padding = this.props.padding;
    const stride = this.props.stride;

    let hoverOver = this.state.hoverOver;
    let hoverH = this.state.hoverH;
    let hoverW = this.state.hoverW;

    // The primary heavy lifting of the render() function is to
    // define colorizer functions for each matrix, such that
    //
    //    colorizer(i, j) = color of the cell at i, j
    //
    let inputColorizer = undefined;
    let weightColorizer = undefined;
    let outputColorizer = undefined;

    // After colorizing an input cell, apply darkening if the cell falls
    // within the padding.  This function is responsible for rendering
    // the dark padding border; if you replace this with a passthrough
    // to f no dark padding border will be rendered.
    function inputColorizerWrapper(f) {
      return (i, j) => {
        let r = f(i, j);
        if (typeof r === "undefined") {
          r = d3.color("white");
        } else {
          r = d3.color(r);
        }
        if (i < padding || i >= input_size + padding || j < padding || j >= input_size + padding) {
          r = r.darker(2.5);
        }
        return r;
      };
    }

    // Given the animation timestep, determine the output coordinates
    // of our animated stencil.
    const flat_animated = this.state.counter % (output_size * output_size);
    const animatedH = Math.floor(flat_animated / output_size);
    const animatedW = flat_animated % output_size;

    // If the user is not hovering over any matrix, render "as if"
    // they were hovering over the animated output coordinate.
    if (!hoverOver) {
      hoverOver = "output";
      hoverH = animatedH;
      hoverW = animatedW;
    }

    // If the user is hovering over the input matrix, render "as if'
    // they were hovering over the output coordinate, such that the
    // top-left corner of the stencil is attached to the cursor.
    if (hoverOver === "input") {
      hoverOver = "output";
      hoverH = Math.min(Math.floor(hoverH / stride), output_size - 1);
      hoverW = Math.min(Math.floor(hoverW / stride), output_size - 1);
    }

    // Generate the color interpolator for generating the kernels.
    // This particular scale was found via experimentation with various
    // start/endpoints and different interpolation schemes.  For more
    // documentation on these D3 functions, see:
    //
    //  - https://github.com/d3/d3-interpolate
    //  - https://github.com/d3/d3-color
    //
    // Some notes on what I was going for, from an aesthetic perspective:
    //
    //  - The most important constraint is that all colors produced by the
    //    interpolator need to be saturated enough so they are not confused
    //    with the "animation" shadow.
    //  - I wanted the interpolation to be smooth, despite this being a
    //    discrete setting where an ordinal color scheme could be
    //    employed.  (Also I couldn't get the color schemes to work lol.)
    //
    // If you are a visualization expert and have a pet 2D color
    // interpolation scheme, please try swapping it in here and seeing
    // how it goes.
    const scale_size = weight_size;
    const xScale = d3.scaleSequential(d3.interpolateLab('#d7191c', '#2c7bb6')).domain([-1, scale_size])
    const yScale = d3.scaleSequential(d3.interpolateLab('#d7191c', d3.color('#1a9641').brighter(1))).domain([-1, scale_size])
    function xyScale(i, j) {
      return d3.color(d3.interpolateLab(xScale(i), yScale(j))((j-i) / (scale_size-1)));
    }

    // Given an output coordinate 'hoverH, hoverW', compute a mapping
    // from inputs to the weight coordinates which multiplied with
    // that input.
    //
    // Result:
    //    r[input_height][input_width] = [weight_height, weight_width]
    function compute_input_multiplies_with_weight(hoverH, hoverW) {
      const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
      for (let h_weight = 0; h_weight < weight_size; h_weight++) {
        for (let w_weight = 0; w_weight < weight_size; w_weight++) {
          const flat_input = output[hoverH][hoverW][h_weight][w_weight];
          if (typeof flat_input === "undefined") continue;
          input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
        }
      }
      return input_multiplies_with_weight;
    }

    // The user is hovering over the output matrix (or the input matrix)
    if (hoverOver === "output") {
      outputColorizer = (i, j) => {
        const base = d3.color('#666')
        // If this output is selected, display it as dark grey
        if (hoverH === i && hoverW === j) {
          return base;
        }

        // Otherwise, if the output is animated, display it as a lighter
        // gray
        if (animatedH === i && animatedW === j) {
          return whiten(base, 0.8);
        }
      };

      const input_multiplies_with_weight = compute_input_multiplies_with_weight(hoverH, hoverW);
      const animated_input_multiplies_with_weight = compute_input_multiplies_with_weight(animatedH, animatedW);

      inputColorizer = inputColorizerWrapper((i, j) => {
        // If this input was used to compute the selected output, render
        // it the same color as the corresponding entry in the weight
        // matrix which it was multiplied against.
        const r = input_multiplies_with_weight[i * padded_input_size + j];
        if (r) {
          return xyScale(r[0], r[1]);
        }

        // Otherwise, if the input was used to compute the animated
        // output, render it as a lighter version of the weight color it was
        // multiplied against.
        const s = animated_input_multiplies_with_weight[i * padded_input_size + j];
        if (s) {
          return whiten(xyScale(s[0], s[1]), 0.8);
        }
      });

      // The weight matrix displays the full 2D color scale
      weightColorizer = (i, j) => {
        return xyScale(i, j);
      };

    // The user is hovering over the weight matrix
    } else if (hoverOver === "weight") {

      weightColorizer = (i, j) => {
        // If this weight is selected, render its color
        if (hoverH === i && hoverW === j) {
          return xyScale(hoverH, hoverW);
        }
      };

      // Compute a mapping from flat input index to output coordinates which
      // this input multiplied with the selected weight to produce.
      const input_produces_output = array1d(padded_input_size * padded_input_size);
      for (let h_out = 0; h_out < output_size; h_out++) {
        for (let w_out = 0; w_out < output_size; w_out++) {
          const flat_input = output[h_out][w_out][hoverH][hoverW];
          if (typeof flat_input === "undefined") continue;
          input_produces_output[flat_input] = [h_out, w_out];
        }
      }

      const animated_input_multiplies_with_weight = compute_input_multiplies_with_weight(animatedH, animatedW);

      inputColorizer = inputColorizerWrapper((i, j) => {
        // We are only rendering inputs which multiplied against a given
        // weight, so render all inputs the same color as the selected
        // weight.
        const color = xyScale(hoverH, hoverW);

        // If this input cell was multiplied by the selected weight to
        // produce the animated output, darken it.  This shows the
        // current animation step's "contribution" to the colored
        // inputs.
        const s = animated_input_multiplies_with_weight[i * padded_input_size + j];
        if (s) {
          if (s[0] === hoverH && s[1] === hoverW) {
            return color.darker(1);
          }
        }

        // If this input cell was multiplied by the selected weight to
        // produce *some* output, render it as the weight's color.
        const r = input_produces_output[i * padded_input_size + j];
        if (r) {
          // BUT, if the input cell is part of the current animation
          // stencil, lighten it so that we can still see the stencil.
          if (s) {
            return whiten(color, 0.2);
          }
          return color;
        }

        // If this input cell is part of the animated stencil (and
        // it is not part of the solid block of color), render a shadow
        // of the stencil so we can still see it.
        if (s) {
          return whiten(xyScale(s[0], s[1]), 0.8);
        }
      });

      // The output matrix is a solid color of the selected weight.
      outputColorizer = (i, j) => {
        const color = xyScale(hoverH, hoverW);
        // If the output is the animated one, darken it, so we can
        // see the animation.
        if (i === animatedH && j === animatedW) {
          return color.darker(1);
        }
        return color;
      };
    }

    return (
      <div className="viewport">
        <div className="grid-container">
          Input ({input_size} × {input_size}):
          <Grid size={input_size + 2 * padding}
                colorizer={inputColorizer}
                onMouseEnter={(e, i, j) => {
                  this.setState({hoverOver: "input", hoverH: i, hoverW: j});
                }}
                onMouseLeave={(e, i, j) => {
                  this.setState({hoverOver: undefined, hoverH: undefined, hoverW: undefined});
                }}
                />
        </div>
        <div className="grid-container">
          Weight ({weight_size} × {weight_size}):
          <Grid size={weight_size}
                colorizer={weightColorizer}
                onMouseEnter={(e, i, j) => {
                  this.setState({hoverOver: "weight", hoverH: i, hoverW: j});
                }}
                onMouseLeave={(e, i, j) => {
                  this.setState({hoverOver: undefined, hoverH: undefined, hoverW: undefined});
                }}
                />
        </div>
        <div className="grid-container">
          Output ({output_size} × {output_size}):
          <Grid size={output_size}
                colorizer={outputColorizer}
                onMouseEnter={(e, i, j) => {
                  this.setState({hoverOver: "output", hoverH: i, hoverW: j});
                }}
                onMouseLeave={(e, i, j) => {
                  this.setState({hoverOver: undefined, hoverH: undefined, hoverW: undefined});
                }}
                />
        </div>
      </div>
      );
    }
}

/**
 * A square matrix grid which we render our matrix animations.
 *
 * Properties:
 *    - size: The height/width of the matrix
 *    - colorizer: A function f(i, j), returning the color of the i,j cell
 *    - onMouseEnter: A callback invoked f(event, i, j) when the i,j cell is
 *                    entered by a mouse.
 *    - onMouseLeave: A callback invoked f(event, i, j) when the i,j cell is
 *                    left by a mouse.
 */
function Grid(props) {
  const size = parseInt(props.size, 10);
  const grid = array2d(size, size);
  const xgrid = grid.map((row, i) => {
    const xrow = row.map((e, j) => {
      // Use of colorizer this way means we force recompute of all tiles
      const color = props.colorizer ? props.colorizer(i, j) : undefined;
      return <td key={j}
                 style={{backgroundColor: color}}
                 onMouseEnter={props.onMouseEnter ?
                               ((e) => props.onMouseEnter(e, i, j)) : undefined}
                 onMouseLeave={props.onMouseLeave ?
                               ((e) => props.onMouseLeave(e, i, j)) : undefined} />
    });
    return <tr key={i}>{xrow}</tr>;
  });
  return <table><tbody>{xgrid}</tbody></table>;
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

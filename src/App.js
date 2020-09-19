import React from "react";
import Slider from "./components/Slider";
import Viewport from "./components/Viewport";
import {
  array2d,
  computeOutputSize,
  paramsOK,
  maxWhile,
  minWhile,
} from "./util/helper";
import "./styles/App.css";

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

    const output_size = computeOutputSize(
      input_size,
      weight_size,
      padding,
      dilation,
      stride
    );

    // Compute the convolution symbolically.

    // output[output_height][output_width] =
    //    symbolic expression s for this cell, where
    //    s[kernel_height][kernel_width] =
    //      the flat input index multiplied against this kernel entry
    //      (undefined if this entry not used)
    //
    // Recall: the flat input index for (i, j) in a square matrix is 'i * size + j'
    const output = array2d(output_size, output_size, (i, j) =>
      array2d(weight_size, weight_size)
    );

    for (let h_out = 0; h_out < output_size; h_out++) {
      for (let w_out = 0; w_out < output_size; w_out++) {
        for (let h_kern = 0; h_kern < weight_size; h_kern++) {
          for (let w_kern = 0; w_kern < weight_size; w_kern++) {
            // NB: We purposely don't apply padding here, this is
            // handled at render time.
            const h_im = h_out * stride + h_kern * dilation;
            const w_im = w_out * stride + w_kern * dilation;
            output[h_out][w_out][h_kern][w_kern] =
              h_im * padded_input_size + w_im;
          }
        }
      }
    }

    // Make an extended params dictionary with our new computed values
    // to pass to the inner component.
    const params = Object.assign(
      {
        padded_input_size: padded_input_size,
        output_size: output_size,
        output: output,
      },
      this.state
    );

    const onChange = (state_key) => {
      return (e) => {
        const r = parseInt(e.target.value, 10);
        // Text inputs can sometimes temporarily be in invalid states.
        // If it's not a valid number, refuse to set it.
        if (typeof r !== "undefined") {
          this.setState({ [state_key]: r });
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
          This interactive visualization demonstrates how various convolution
          parameters affect shapes and data dependencies between the input,
          weight and output matrices. Hovering over an input/output will
          highlight the corresponding output/input, while hovering over an
          weight will highlight which inputs were multiplied into that weight to
          compute an output. (Strictly speaking, the operation visualized here
          is a <em>correlation</em>, not a convolution, as a true convolution
          flips its weights before performing a correlation. However, most deep
          learning frameworks still call these convolutions, and in the end it's
          all the same to gradient descent.)
        </p>
        <form className="form">
          <fieldset>
            <legend>Input size:</legend>
            <Slider
              min={minWhile(max_input_size, 1, (x) =>
                paramsOK(x, weight_size, padding, dilation, stride)
              )}
              max={max_input_size}
              value={input_size}
              onChange={onChange("input_size")}
            />
          </fieldset>
          <fieldset>
            <legend>Kernel size:</legend>
            <Slider
              min="1"
              max={maxWhile(1, 100, (x) =>
                paramsOK(input_size, x, padding, dilation, stride)
              )}
              value={weight_size}
              onChange={onChange("weight_size")}
            />
          </fieldset>
          <fieldset>
            <legend>Padding:</legend>
            <Slider
              min={minWhile(dilation * (weight_size - 1), 0, (x) =>
                paramsOK(input_size, weight_size, x, dilation, stride)
              )}
              max={dilation * (weight_size - 1)}
              value={padding}
              onChange={onChange("padding")}
            />
          </fieldset>
          <fieldset>
            <legend>Dilation:</legend>
            <Slider
              min="1"
              max={maxWhile(1, 100, (x) =>
                paramsOK(input_size, weight_size, padding, x, stride)
              )}
              value={dilation}
              onChange={onChange("dilation")}
              disabled={weight_size === 1}
            />
          </fieldset>
          <fieldset>
            <legend>Stride:</legend>
            <Slider
              min="1"
              max={Math.max(input_size - dilation * (weight_size - 1), 1)}
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

export default App;

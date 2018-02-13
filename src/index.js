import React from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3v4';
import './index.css';

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
        size={2}
        />
    </span>
  );
}

function array1d(length, f) {
  return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
}

function array2d(height, width, f) {
  return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
}

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

    function computeOutputSize(input_size, weight_size, padding, dilation, stride) {
      return Math.floor((input_size + 2 * padding - dilation * (weight_size - 1) - 1) / stride + 1);
    }
    function paramsOK(input_size, weight_size, padding, dilation, stride) {
      console.log(input_size, weight_size, padding, dilation, stride, computeOutputSize(input_size, weight_size, padding, dilation, stride));
      return computeOutputSize(input_size, weight_size, padding, dilation, stride) > 0;
    }
    const output_size = computeOutputSize(input_size, weight_size, padding, dilation, stride);

    function maxWhile(start, end, pred) {
      for (let i = start; i <= end; i++) {
        if (pred(i)) continue;
        return i - 1;
      }
      return end;
    }

    function minWhile(start, end, pred) {
      for (let i = start; i >= end; i--) {
        if (pred(i)) continue;
        return i + 1;
      }
      return end;
    }

    // Compute the convolution symbolically, tracking uses

    // output[output_height][output_width] =
    //    symbolic expression s for this cell, where
    //    s[kernel_height][kernel_width] =
    //      the flat input index multiplied against this kernel entry
    //      (undefined if this entry not used)
    const output = array2d(output_size, output_size, (i, j) => array2d(weight_size, weight_size));

    for (let h_out = 0; h_out < output_size; h_out++) {
      for (let w_out = 0; w_out < output_size; w_out++) {
        for (let h_kern = 0; h_kern < weight_size; h_kern++) {
          for (let w_kern = 0; w_kern < weight_size; w_kern++) {
            // NB: We purposely don't apply padding here, we handle
            // that at render time
            const h_im = h_out * stride + h_kern * dilation;
            const w_im = w_out * stride + w_kern * dilation;
            output[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
          }
        }
      }
    }
    const params = Object.assign({
      padded_input_size: padded_input_size,
      output_size: output_size,
      output: output,
    }, this.state);

    const onChange = (state_key) => {
      return (e) => {
        const r = parseInt(e.target.value, 10);
        if (typeof r !== "undefined") {
          this.setState({[state_key]: r});
        }
      };
    };

    return (
      <div>
        <h1>Convolution Visualizer</h1>
        <div className="author">Edward Z. Yang</div>
        <p>
          This interactive application demonstrates how various convolution parameters
          affect shapes and data dependencies between the input, weight and
          output matrices.  Hovering over an input/output will highlight the
          corresponding output/input, while hovering over an weight
          will highlight which inputs were multiplied into that weight to
          compute an output.
        </p>
        <form className="form">
          <fieldset>
            <legend>Input size:</legend>
            <Slider min={minWhile(16, 1, (x) => paramsOK(x, weight_size, padding, dilation, stride))}
                    max="16"
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

class Viewport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hoverOver: undefined,
      hoverH: undefined,
      hoverW: undefined,
      counter: 0
    };
  }

  tick() {
    this.setState({counter: this.state.counter + 1});
  }

  componentDidMount() {
    this.interval = setInterval(this.tick.bind(this), 1000);
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

    let inputColorizer = undefined;
    let weightColorizer = undefined;
    let outputColorizer = undefined;

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

    const flat_crawling = this.state.counter % (output_size * output_size);
    const crawlingH = Math.floor(flat_crawling / output_size);
    const crawlingW = flat_crawling % output_size;
    if (!hoverOver) {
      hoverOver = "output";
      hoverH = crawlingH;
      hoverW = crawlingW;
    }

    if (hoverOver === "input") {
      hoverOver = "output";
      hoverH = Math.min(Math.floor(hoverH / stride), output_size - 1);
      hoverW = Math.min(Math.floor(hoverW / stride), output_size - 1);
    }

    const scale_size = weight_size;
    // Constraints: everything needs to be saturated enough so
    // it is clearly distinguished from shadows.  Probably something
    // a lot better to use here...
    const xScale = d3.scaleSequential(d3.interpolateLab('#d7191c', '#2c7bb6')).domain([-1, scale_size])
    const yScale = d3.scaleSequential(d3.interpolateLab('#d7191c', d3.color('#1a9641').brighter(1))).domain([-1, scale_size])
    function xyScale(i, j) {
      return d3.color(d3.interpolateLab(xScale(i), yScale(j))((j-i) / (scale_size-1)));
    }

    function compute_input_multiplies_with_weight(hoverH, hoverW) {
      const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
      // input_multiplies_with_weight[input_height][input_width] = [weight_height, weight_width]
      for (let h_weight = 0; h_weight < weight_size; h_weight++) {
        for (let w_weight = 0; w_weight < weight_size; w_weight++) {
          const flat_input = output[hoverH][hoverW][h_weight][w_weight];
          if (typeof flat_input === "undefined") continue;
          input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
        }
      }
      return input_multiplies_with_weight;
    }

    if (hoverOver === "output") {
      outputColorizer = (i, j) => {
        const base = d3.color('#666')
        if (hoverH === i && hoverW === j) {
          return base;
        }
        if (crawlingH === i && crawlingW === j) {
          base.opacity = 0.2;
          return base;
        }
      };
      const input_multiplies_with_weight = compute_input_multiplies_with_weight(hoverH, hoverW);
      const crawling_input_multiplies_with_weight = compute_input_multiplies_with_weight(crawlingH, crawlingW);
      inputColorizer = inputColorizerWrapper((i, j) => {
        const r = input_multiplies_with_weight[i * padded_input_size + j];
        if (r) {
          return xyScale(r[0], r[1]);
        }
        const s = crawling_input_multiplies_with_weight[i * padded_input_size + j];
        if (s) {
          const color = xyScale(s[0], s[1]);
          color.opacity = 0.2;
          return color;
        }
      });
      weightColorizer = (i, j) => {
        return xyScale(i, j);
      };
    } else if (hoverOver === "weight") {
      weightColorizer = (i, j) => {
        if (hoverH === i && hoverW === j) {
          return xyScale(hoverH, hoverW);
        }
      };
      const input_produces_output = array1d(padded_input_size * padded_input_size);
      for (let h_out = 0; h_out < output_size; h_out++) {
        for (let w_out = 0; w_out < output_size; w_out++) {
          const flat_input = output[h_out][w_out][hoverH][hoverW];
          if (typeof flat_input === "undefined") continue;
          input_produces_output[flat_input] = [h_out, w_out];
        }
      }
      const crawling_input_multiplies_with_weight = compute_input_multiplies_with_weight(crawlingH, crawlingW);
      inputColorizer = inputColorizerWrapper((i, j) => {
        const color = xyScale(hoverH, hoverW);
        const s = crawling_input_multiplies_with_weight[i * padded_input_size + j];
        if (s) {
          if (s[0] === hoverH && s[1] === hoverW) {
            return color.darker(1);
          }
        }
        const r = input_produces_output[i * padded_input_size + j];
        if (r) {
          if (s) {
            color.opacity = 0.8;
            return color;
          }
          return color;
        }
        if (s) {
          const color = xyScale(s[0], s[1]);
          color.opacity = 0.2;
          return color;
        }
      });
      outputColorizer = (i, j) => {
        const color = xyScale(hoverH, hoverW);
        if (i === crawlingH && j === crawlingW) {
          return color.darker(1);
        }
        return color;
      };
    }

    //const inputH = this.props.output[this.state.outputH];

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

function Square(props) {
  return (
    <td style={{backgroundColor: props.color}}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}>
    </td>
  );
}

function Grid(props) {
  const size = parseInt(props.size, 10);
  const grid = array2d(size, size);
  const xgrid = grid.map((row, i) => {
    const xrow = row.map((e, j) => {
      // Use of colorizer this way means we force recompute of all tiles
      const color = props.colorizer ? props.colorizer(i, j) : undefined;
      return <Square key={j}
                     color={color}
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

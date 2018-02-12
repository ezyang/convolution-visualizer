import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function Slider(props) {
  const maxLength = Math.ceil(Math.log10(props.max));
  return (
    <span className="slider">
      <input type="range" min={props.min} max={props.max} value={props.value}
        onChange={props.onChange} />
      <input type="text" value={props.value}
        onChange={props.onChange}
        maxLength={maxLength} />
    </span>
  );
}

/*
function array1d(length, f) {
  return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
}
*/

function array2d(height, width, f) {
  return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      input_size: 5,
      kernel_size: 3,
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
    const kernel_size = this.state.kernel_size;
    const padding = this.state.padding;
    const dilation = this.state.dilation;
    const stride = this.state.stride;
    const output_size = Math.floor((input_size + 2 * padding - dilation * (kernel_size - 1) - 1) / stride + 1);
    // TODO: Clamp when illegal values

    // Compute the convolution symbolically, tracking uses
    // TODO: selector-ify this code

    // input_output_uses[input_height][input_width] =
    //    set of flat output indices which use this input
    const input_output_uses = array2d(input_size, input_size, (i, j) => new Set());

    // output[output_height][output_width] =
    //    symbolic expression s for this cell, where
    //    s[kernel_height][kernel_width] =
    //      the flat input index multiplied against this kernel entry
    //      (undefined if this entry not used)
    const output = array2d(output_size, output_size, (i, j) => array2d(kernel_size, kernel_size));

    for (let h_out = 0; h_out < output_size; h_out++) {
      for (let w_out = 0; w_out < output_size; w_out++) {
        for (let h_kern = 0; h_kern < kernel_size; h_kern++) {
          for (let w_kern = 0; w_kern < kernel_size; w_kern++) {
            const h_im = h_out * stride - padding + h_kern * dilation;
            const w_im = w_out * stride - padding + w_kern * dilation;
            input_output_uses[h_im][w_im].add(h_out * output_size + w_out);
            output[h_out][w_out][h_kern][w_kern] = h_im * input_size + w_im;
          }
        }
      }
    }

    const params = Object.assign({
      output_size: output_size,
      input_output_uses: input_output_uses,
      output: output,
    }, this.state);

    return (
      <div>
        <form className="form">
          <fieldset>
            <legend>Input size:</legend>
            <Slider min="1" max="16" value={input_size}
                    onChange={(e) => this.setState({input_size: parseInt(e.target.value, 10)})} />
          </fieldset>
          <fieldset>
            <legend>Kernel size:</legend>
            <Slider min="1" max="16" value={kernel_size}
                    onChange={(e) => this.setState({kernel_size: parseInt(e.target.value, 10)})} />
          </fieldset>
          <fieldset>
            <legend>Padding:</legend>
            <Slider min="0" max="16" value={padding}
                    onChange={(e) => this.setState({padding: parseInt(e.target.value, 10)})} />
          </fieldset>
          <fieldset>
            <legend>Dilation:</legend>
            <Slider min="1" max="16" value={dilation}
                    onChange={(e) => this.setState({dilation: parseInt(e.target.value, 10)})} />
          </fieldset>
          <fieldset>
            <legend>Stride:</legend>
            <Slider min="1" max="16" value={stride}
                    onChange={(e) => this.setState({stride: parseInt(e.target.value, 10)})} />
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
      hoverW: undefined
    };
  }

  render() {
    const input_size = this.props.input_size;
    const kernel_size = this.props.kernel_size;
    const output_size = this.props.output_size;
    const output = this.props.output;
    const input_output_uses = this.props.input_output_uses;

    const hoverOver = this.state.hoverOver;
    const hoverH = this.state.hoverH;
    const hoverW = this.state.hoverW;

    let inputColorizer = undefined;
    let weightColorizer = undefined;
    let outputColorizer = undefined;

    if (hoverOver === "output") {
      outputColorizer = (i, j) => {
        if (hoverH === i && hoverW === j) {
          return '#666';
        }
      };
      inputColorizer = (i, j) => {
        if (input_output_uses[i][j].has(hoverH * output_size + hoverW)) {
          return '#666';
        }
      };
      weightColorizer = (i, j) => {
        return '#666';
      };
    } else if (hoverOver === "weight") {
      weightColorizer = (i, j) => {
        if (hoverH === i && hoverW === j) {
          return '#666';
        }
      };
      const markedInputs = new Map();
      for (let h_out = 0; h_out < output_size; h_out++) {
        for (let w_out = 0; w_out < output_size; w_out++) {
          const markedInput = output[h_out][w_out][hoverH][hoverW];
          const c = markedInputs.get(markedInput);
          markedInputs.set(markedInput, c + 1);
        }
      }
      inputColorizer = (i, j) => {
        if (markedInputs.has(i * input_size + j)) {
          return '#666';
        }
      }
      outputColorizer = (i, j) => {
        return '#666';
      };
    }

    //const inputH = this.props.output[this.state.outputH];

    return (
      <div>
        <div className="grid-container">
          Input ({input_size} x {input_size}):
          <Grid size={input_size}
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
          Weight ({kernel_size} x {kernel_size}):
          <Grid size={kernel_size}
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
          Output ({output_size} x {output_size}):
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
    <button className="square"
            style={{backgroundColor: props.color}}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}>
      {props.value}
    </button>
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
    return <div className="row" key={i}>{xrow}</div>;
  });
  return <div>{xgrid}</div>;
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

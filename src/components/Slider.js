import React from "react";

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
export default function Slider(props) {
  const max = parseInt(props.max, 10);
  const min = parseInt(props.min, 10);
  const maxLength = max ? Math.ceil(Math.log10(max)) : 1;
  const disabled = props.disabled || min >= max;
  return (
    <span className="slider">
      <input
        type="range"
        min={min}
        max={max}
        value={props.value}
        onChange={props.onChange}
        disabled={disabled}
      />
      <input
        type="text"
        value={props.value}
        onChange={props.onChange}
        maxLength={maxLength}
        disabled={disabled}
        size={Math.max(maxLength, 2)}
      />
    </span>
  );
}

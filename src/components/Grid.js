import React from "react";
import { array2d } from "../util/helper";
import "../styles/Grid.css";
/**
 * A square matrix grid in which we render our matrix animations.
 *
 * Properties:
 *    - size: The height/width of the matrix
 *    - colorizer: A function f(i, j), returning the color of the i,j cell
 *    - onMouseEnter: A callback invoked f(event, i, j) when the i,j cell is
 *                    entered by a mouse.
 *    - onMouseLeave: A callback invoked f(event, i, j) when the i,j cell is
 *                    left by a mouse.
 */
export default function Grid(props) {
  const size = parseInt(props.size, 10);
  const grid = array2d(size, size);
  const xgrid = grid.map((row, i) => {
    const xrow = row.map((e, j) => {
      // Use of colorizer this way means we force recompute of all tiles
      const color = props.colorizer ? props.colorizer(i, j) : undefined;
      return (
        <td
          key={j}
          style={{ backgroundColor: color }}
          onMouseEnter={
            props.onMouseEnter ? (e) => props.onMouseEnter(e, i, j) : undefined
          }
          onMouseLeave={
            props.onMouseLeave ? (e) => props.onMouseLeave(e, i, j) : undefined
          }
        />
      );
    });
    return <tr key={i}>{xrow}</tr>;
  });
  return (
    <table>
      <tbody>{xgrid}</tbody>
    </table>
  );
}

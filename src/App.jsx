import { useState, useRef, useEffect } from "react";
import "./App.css";

import iconSquare from "./assets/square-icon.svg";
import iconCircle from "./assets/circle-icon.svg";

const DPI = 96;

const DEFAULT_WIDTH = 6; // inches
const DEFAULT_HEIGHT = 4; // inches

const renderSquare = (x, y, width, height, fillet_radius) => {
  return (
    <g transform={`translate(${x - width / 2}, ${y - height / 2})`}>
      <path
        stroke="red"
        fill="none"
        d={`
          M ${fillet_radius} 0 
          H ${width - fillet_radius} 
          A ${fillet_radius} ${fillet_radius} 0 0 1 ${width} ${fillet_radius} 
          V ${height - fillet_radius}
          A ${fillet_radius} ${fillet_radius} 0 0 1 ${
          width - fillet_radius
        } ${height} 
          H ${fillet_radius} 
          A ${fillet_radius} ${fillet_radius} 0 0 1 0 ${height - fillet_radius} 
          V ${fillet_radius} 
          A ${fillet_radius} ${fillet_radius} 0 0 1 ${fillet_radius} 0
          Z`}
      />
    </g>
  );
};

const renderCircle = (x, y, radius) => {
  return <circle cx={x} cy={y} r={radius} stroke="red" fill="none" />;
};

const DEFAULT_PARAMS = [
  {
    name: "X",
    type: "dimension",
    default: 1,
    min: 0,
    max: "WIDTH",
  },
  {
    name: "Y",
    type: "dimension",
    default: 1,
    min: 0,
    max: "HEIGHT",
  },
];

const SHAPE_DEFS = [
  {
    name: "Square",
    icon: iconSquare,
    render: renderSquare,
    params: [
      {
        name: "Width",
        type: "dimension",
        default: 1,
        min: 0,
      },
      {
        name: "Height",
        type: "dimension",
        default: 1,
        min: 0,
      },
      {
        name: "Fillet Radius",
        type: "dimension",
        default: 0.1,
        min: 0,
      },
    ],
  },
  {
    name: "Circle",
    icon: iconCircle,
    render: renderCircle,
    params: [
      {
        name: "Radius",
        type: "dimension",
        default: 0.5,
        min: 0,
      },
    ],
  },
];

function App() {
  const [shapes, setShapes] = useState([]);
  const [selectedShapeTypeIndex, setSelectedShapeTypeIndex] = useState(null);
  const [selectedShapeIndex, setSelectedShapeIndex] = useState(null);
  const [shapeDraggingOffset, setShapeDraggingOffset] = useState(null);

  const [isExporting, setIsExporting] = useState(false);
  const svgRef = useRef();

  const selectedShapeType = SHAPE_DEFS[selectedShapeTypeIndex];
  const selectedShape = shapes[selectedShapeIndex];

  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    function onPointerUp() {
      setShapeDraggingOffset(null);
    }
    // detect pointer up even if it goes off the canvas
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [setShapeDraggingOffset]);

  function onPointerDown(e) {
    if (selectedShapeTypeIndex == null) {
      setSelectedShapeIndex(null);
      return; // no shape selected
    }
    let x = e.nativeEvent.offsetX / DPI;
    let y = e.nativeEvent.offsetY / DPI;
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;

    const newShape = {
      def: selectedShapeType,
      params: [x, y, ...selectedShapeType.params.map((p) => p.default)],
    };

    setShapes([...shapes, newShape]);
    setSelectedShapeIndex(shapes.length);
    setSelectedShapeTypeIndex(null); // reset shape type selection
  }

  function onPointerMove(e) {
    if (!shapeDraggingOffset) {
      return;
    }
    let x = e.nativeEvent.offsetX / DPI;
    let y = e.nativeEvent.offsetY / DPI;
    x -= shapeDraggingOffset.x;
    y -= shapeDraggingOffset.y;
    x = Math.max(0, Math.min(canvasWidth, x));
    y = Math.max(0, Math.min(canvasHeight, y));
    x = Math.round(x * 100) / 100;
    y = Math.round(y * 100) / 100;
    const newParams = selectedShape.params;
    newParams[0] = x;
    newParams[1] = y;
    setShapes(
      shapes.map((shape, index) => {
        if (index === selectedShapeIndex) {
          return {
            ...shape,
            params: newParams,
          };
        }
        return shape;
      })
    ); 
  }

  function onExport() {
    setIsExporting(true);
  }

  useEffect(() => {
    if (isExporting) {
      downloadSVG();
    }
  }, [isExporting]);

  function downloadSVG() {
    // console.log(svgRef.current.innerHTML);
    const blob = new Blob([svgRef.current.innerHTML], {
      type: "image/svg+xml",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "drawing.svg";
    link.click();
    setIsExporting(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button id="exportButton" onClick={onExport}>
          Export
        </button>
        <ShapeSelector
          selectedShapeTypeIndex={selectedShapeTypeIndex}
          shapeDefs={SHAPE_DEFS}
          onChange={(e) => setSelectedShapeTypeIndex(parseInt(e.target.value))}
        />
      </div>
      <div id="canvas" ref={svgRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
        <svg
          id="svg"
          xmlns="http://www.w3.org/2000/svg"
          width={canvasWidth+"in"}
          height={canvasHeight+"in"}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        >
          {shapes.map((shape, i) => {
            const x = shape.params[0];
            const y = shape.params[1];
            const r = 0.05;
            return (
              <g
                key={i}
                stroke={selectedShape === shape ? "purple" : "grey"}
                strokeWidth={0.04}
                fill="none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedShapeIndex(i);
                  const offsetX = e.nativeEvent.offsetX / DPI - x;
                  const offsetY = e.nativeEvent.offsetY / DPI - y;
                  setShapeDraggingOffset({ x:offsetX, y:offsetY });
                }}
              >
                {shape.def.render(...shape.params)}
                {!isExporting && (
                  <>
                    <line x1={x} y1={y - r} x2={x} y2={y + r} />
                    <line x1={x - r} y1={y} x2={x + r} y2={y} />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div>
        {selectedShape ?
          selectedShape.params.map((currValue, i) => {
            const paramDef =
              i < DEFAULT_PARAMS.length
                ? DEFAULT_PARAMS[i]
                : selectedShape.def.params[i - DEFAULT_PARAMS.length];

            let max = paramDef.max;
            if (max == 'WIDTH') {
              max = canvasWidth;
            } else if (max == 'HEIGHT') {
              max = canvasHeight;
            }
            return (
              <div key={selectedShapeIndex + 'shape' + i}>
                <label>{paramDef.name}: </label>
                <ValidatedNumericInput
                  min={paramDef.min}
                  max={max}
                  value={currValue}
                  setValue={(value) => {
                    const newParams = selectedShape.params;
                    newParams[i] = value;
                    setShapes(
                      shapes.map((shape, index) => {
                        if (index === selectedShapeIndex) {
                          return {
                            ...shape,
                            params: newParams,
                          };
                        }
                        return shape;
                      })
                    );
                  }}
                />
              </div>
            );
          }) : <div>
            <div>
                <label>Canvas Width: </label>
                <ValidatedNumericInput
                  min={1}
                  max={null}
                  value={canvasWidth}
                  setValue={(value) => {
                    setCanvasWidth(value);
                  }}
                />
              </div>
              <div>
                <label>Canvas Height: </label>
                <ValidatedNumericInput
                  min={1}
                  max={null}
                  value={canvasHeight}
                  setValue={(value) => {
                    setCanvasHeight(value);
                  }}
                />
              </div>
          </div>
          }
      </div>
    </div>
  );
}

function ValidatedNumericInput({min, max, value, setValue}) {
  const [unvalidatedInput, setUnvalidatedInput] = useState(null);
  const onFocus = () => setUnvalidatedInput(value);
  const onBlur = () => setUnvalidatedInput(null);
  return <input
    type="number"
    step="0.01"
    value={unvalidatedInput !== null ?unvalidatedInput : value}
    onFocus={onFocus}
    onBlur={onBlur}
    onChange={(e) => {
      setUnvalidatedInput(e.target.value);
      let parsedValue = parseFloat(e.target.value);
      if (isNaN(parsedValue)) {
        return;
      }
      if (min != null && parsedValue < min)
        parsedValue = min;
      if (max != null && parsedValue > max)
        parsedValue = max;
      setValue(parsedValue);
    }}
  />;
}

function ShapeSelector({ selectedShapeTypeIndex, shapeDefs, onChange }) {
  return (
    <div className="mode-container">
      <div className="mode">
        {shapeDefs.map((shapeDef, i) => (
          <label key={shapeDef.name}>
            <input
              type="radio"
              name="mode"
              value={i}
              checked={selectedShapeTypeIndex === i}
              onChange={onChange}
            />
            <img className="icon" src={shapeDef.icon} />
          </label>
        ))}
      </div>
    </div>
  );
}

export default App;

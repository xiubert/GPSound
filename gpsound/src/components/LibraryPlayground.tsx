// import React from 'react';
// import Flatten from 'flatten-js';

// const LibraryPlayground: React.FC = () => {
//   console.log('Component rendering...'); // Set breakpoint here first
  
//   const runCalculations = () => {
//     let {point, circle, segment, PlanarSet} = Flatten;
//     let c = circle(point(200, 110), 50);
//     let c2 = circle(point(250, 160), 80);
//     const shapes = [c, c2];
//     let planarSet = new PlanarSet();
//     let qpoint = point(255,165);

//     shapes.forEach((shape,index) => {
//       planarSet.add({box: shape.box, value: shape})
//     });

//     console.log('PlanarSet:', planarSet);
    
//     let inshapes = planarSet.hit(qpoint); // Set breakpoint here
//     return inshapes;
//   };

//   const [result, setResult] = React.useState(null);

//   return (
//     <div>
//       <h2>Library Playground</h2>
//       <button onClick={() => setResult(runCalculations())}>
//         Run Calculations
//       </button>
//       {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
//     </div>
//   );
// };

// export default LibraryPlayground;

import React, { useRef } from 'react';
import * as d3 from 'd3';
import Flatten from 'flatten-js';

const LibraryPlayground: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [result, setResult] = React.useState(null);
  
  const width = 400;
  const height = 300;

  const drawShapes = (shapes: any[], qpoint: any, inshapes: any[]) => {
    if (!svgRef.current) return;

    // Create D3 selection for the SVG
    const stage = d3.select(svgRef.current);
    
    // Clear existing content
    stage.selectAll("*").remove();
    
    // Create bounding box for SVG operations
    const box = new Flatten.Box(0, 0, width, height);
    
    // Start with empty SVG string
    let svg = "";
    
    // Add shapes using Flatten's built-in svg() method
    shapes.forEach((shape, index) => {
      const isHit = inshapes.some(hit => hit.value === shape);
      const strokeColor = isHit ? "red" : "blue";
      const fillColor = isHit ? "rgba(255,0,0,0.1)" : "rgba(0,0,255,0.1)";
      
      svg += shape.svg({
        stroke: strokeColor,
        fill: fillColor,
        'stroke-width': 2
      });
    });
    
    // Add query point using Flatten's svg() method
    svg += qpoint.svg({
      fill: "green",
      r: 5,
      stroke: "darkgreen",
      'stroke-width': 2
    });
    
    // Add labels as text elements (these need to be added separately as Flatten doesn't handle text)
    let labelsSvg = "";
    shapes.forEach((shape, index) => {
      if (shape.name === 'circle') {
        labelsSvg += `<text x="${shape.pc.x - 20}" y="${shape.pc.y - shape.r - 10}" 
                            font-family="Arial" font-size="12" fill="black">
                            Circle ${index + 1}
                     </text>`;
      }
    });
    
    labelsSvg += `<text x="${qpoint.x + 10}" y="${qpoint.y - 10}" 
                        font-family="Arial" font-size="12" fill="black">
                        Query Point
                 </text>`;
    
    // Combine all SVG content
    const fullSvg = svg + labelsSvg;
    
    // Set innerHTML property of svg container to svg string
    stage.html(fullSvg);
  };

  const runCalculations = () => {
    console.log('Component rendering...'); // Set breakpoint here first
    
    let {point, circle, segment, PlanarSet} = Flatten;
    let c = circle(point(200, 110), 50);
    let c2 = circle(point(250, 160), 80);
    const shapes = [c, c2];
    let planarSet = new PlanarSet();
    let qpoint = point(255, 180);

    shapes.forEach((shape, index) => {
      planarSet.add({box: shape.box, value: index});
    });

    console.log('PlanarSet:', planarSet);
    
    let inshapes = planarSet.hit(qpoint); // Set breakpoint here
    
    // Draw using D3 and Flatten SVG
    drawShapes(shapes, qpoint, inshapes);
    
    return {
      shapes: shapes.map((s, i) => ({
        type: s.name,
        center: {x: s.pc.x, y: s.pc.y},
        radius: s.r,
        id: i + 1
      })),
      queryPoint: {x: qpoint.x, y: qpoint.y},
      hitResults: inshapes.map(hit => ({
        shapeId: shapes.indexOf(hit.value) + 1,
        shape: hit.value.name
      }))
    };
  };

  // // Auto-run on component mount
  // useEffect(() => {
  //   const result = runCalculations();
  //   setResult(result);
  // }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Library Playground</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setResult(runCalculations())}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#4444ff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Run Calculations & Draw
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h3>Visualization (D3 + Flatten SVG)</h3>
          <svg 
            ref={svgRef}
            width={width} 
            height={height}
            style={{ 
              border: '1px solid #ccc',
              backgroundColor: '#f9f9f9'
            }}
          />
          <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
            Blue circles: Not hit by query point<br/>
            Red circles: Hit by query point<br/>
            Green dot: Query point
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>Results</h3>
          {result && (
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryPlayground;
import React from 'react';
import Flatten from 'flatten-js';

const LibraryPlayground: React.FC = () => {
  let {point, circle, segment, PlanarSet} = Flatten;
  let c = circle(point(200, 110), 50);
  let c2 = circle(point(250, 160), 80);
  const shapes = [c, c2];
  let planarSet = new PlanarSet();
  let qpoint = point(255,165);

  shapes.forEach((shape,index) => {
    planarSet.add({box: shape.box, value: shape})
  }
  )



  console.log('PlanarSet:', planarSet);

  let inshapes = planarSet.hit(qpoint)

  return (
    <div>
      <h2>Library Playground</h2>
      <pre>{JSON.stringify(inshapes, null, 2)}</pre>
    </div>
  );
};

export default LibraryPlayground;

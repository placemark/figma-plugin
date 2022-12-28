import * as d3 from "https://unpkg.com/d3?module"

  (async () => {

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  const bbox = [-74.01079416275026,40.68262324377143,-73.9749598503113,40.687976530243375];
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${bbox.join(',')}`, {
    headers
  });
  const j = await res.json();

  const nodes = new Map();
  const ways = new Map();

  for (let element of j.elements) {
    if (element.type === 'node') {
      nodes.set(element.id, element);
    }
  }


    function proj(node) {
      return [
        (node.lon - bbox[0]) * 30000,
        (node.lat - bbox[1]) * 30000,
      ].join(' ')
    }


  for (let element of j.elements) {
    if (element.type === 'way') {
      element.nodes = element.nodes.map(id => {
        return nodes.get(id);
      });

      const path = drawing.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));

      path.setAttribute('d', element.nodes.map((node, i) => `${i === 0 ? 'M' : 'L'} ${proj(node)}`).join(''));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'black');
      path.setAttribute('stroke-width', '1');
    }
  }

  console.log(ways);

  })();

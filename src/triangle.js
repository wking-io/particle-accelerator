import point from './point';

function rotate(angle, { origin, vertices }) {
  return vertices.map(p => point.rotateAround(origin, angle, p));
}

function fromParticle({ cx, cy, r }) {
  const a = [0 * r + cx, -1 * r + cy];
  const b = [0.866 * r + cx, 0.5 * r + cy];
  const c = [-0.866 * r + cx, 0.5 * r + cy];
  return {
    vertices: [a, b, c],
    origin: [cx, cy],
  };
}

function update(ctx, angle, triangle) {
  const [[ax, ay], [bx, by], [cx, cy]] = rotate(angle, triangle);
  ctx.beginPath();
  ctx.strokeStyle = '#fff';
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.closePath();
}

const triangle = {
  rotate,
  fromParticle,
  update,
};

export default triangle;

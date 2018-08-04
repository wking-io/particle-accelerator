import utils from './utils';

function rotateBy(angle, [x, y]) {
  const cosine = Math.cos(utils.degreesToRads(angle));
  const sine = Math.sin(utils.degreesToRads(angle));
  return [x * cosine - y * sine, y * cosine + x * sine];
}

function translateBy([vx, vy], [px, py]) {
  return [px + vx, py + vy];
}

function vectorFrom([x1, y1], [x2, y2]) {
  return [x2 - x1, y2 - y1];
}

function addTo([px, py], [vx, vy]) {
  return [px + vx, py + vy];
}

function rotateAround(centerPoint, angle, point) {
  const vectors = rotateBy(angle, vectorFrom(centerPoint, point));
  return addTo(centerPoint, vectors);
}

const point = {
  rotateBy,
  translateBy,
  vectorFrom,
  addTo,
  rotateAround,
};

export default point;

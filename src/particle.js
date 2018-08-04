import utils from './utils';

function getSpeed(particle) {
  return Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
}

function setSpeed(heading, particle) {
  const vx = Math.cos(heading) * particle.speed;
  const vy = Math.sin(heading) * particle.speed;
  return Object.assign(particle, { vx, vy });
}

function getHeading(particle) {
  return Math.atan2(particle.vy, particle.vx);
}

function setHeading(speed, heading, particle) {
  const vx = Math.cos(heading) * speed;
  const vy = Math.sin(heading) * speed;
  return Object.assign(particle, { vx, vy });
}

function create({ gravity, cx, cy }) {
  const initParticle = {
    r: 1.5,
    rMax: utils.randomInt(1.5, 6),
    cx,
    cy,
    dying: false,
    origin: [cx, cy],
    vx: 0,
    vy: 0,
    friction: 0.99,
    gravity,
    duration: 0.05,
    speed: 4,
  };

  const newParticle = setSpeed(getHeading(initParticle), initParticle);
  const randomHeading = utils.randomInt(
    utils.degreesToRads(0),
    utils.degreesToRads(360)
  );
  const finalParticle = setHeading(
    getSpeed(newParticle),
    randomHeading,
    newParticle
  );
  return finalParticle;
}

function update({ speed, duration }, p) {
  if (p.cy < 0 || p.r < 1) {
    const cx = p.origin[0];
    const cy = p.origin[1];
    const dying = false;
    const r = 1;
    const rMax = utils.randomInt(1, 6);
    const initParticle = Object.assign(...p, {
      cx,
      cy,
      dying,
      r,
      rMax,
      speed,
      duration,
    });
    const newParticle = setSpeed(getHeading(p), initParticle);
    const randomHeading = utils.randomInt(
      utils.degreesToRads(0),
      utils.degreesToRads(360)
    );
    const finalParticle = setHeading(
      getSpeed(newParticle),
      randomHeading,
      newParticle
    );
    return finalParticle;
  } else {
    const cx = p.cx + p.vx;
    const cy = p.cy + p.vy;
    const vx = p.vx * p.friction;
    const vy = (p.vy + p.gravity) * p.friction;
    if (p.r < p.rMax && p.dying === false) {
      const r = p.r + p.duration;
      const dying = false;
      return Object.assign(p, { cx, cy, vx, vy, r, dying, speed });
    } else {
      const r = p.r - p.duration;
      const dying = true;
      return Object.assign(p, { cx, cy, vx, vy, r, dying, speed });
    }
  }
}

const particle = {
  getSpeed,
  setSpeed,
  getHeading,
  setHeading,
  create,
  update,
};

export default particle;

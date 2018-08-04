import './main.scss';
const utils = {
  degreesToRads: function(degrees) {
    return (degrees / 180) * Math.PI;
  },

  radsToDegrees: function(radians) {
    return (radians * 180) / Math.PI;
  },
  randomInt: function(min, max) {
    return min + Math.random() * (max - min + 1);
  },
};

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  return text
    .split(' ')
    .reduce((lines, word) => {
      var line = lines.pop() || '';
      var testLine = `${line} ${word}`;
      var { width } = ctx.measureText(testLine);
      return width > maxWidth ? [...lines, line, word] : [...lines, testLine];
    }, [])
    .map((line, i) => {
      ctx.fillText(line, x, y + lineHeight * i);
      return line;
    });
}

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

function rotateTriangle(angle, { origin, vertices }) {
  return vertices.map(point => rotateAround(origin, angle, point));
}

function fromParticle({ cx, cy, r, color }) {
  const a = [0 * r + cx, -1 * r + cy];
  const b = [0.866 * r + cx, 0.5 * r + cy];
  const c = [-0.866 * r + cx, 0.5 * r + cy];
  return {
    vertices: [a, b, c],
    color,
    origin: [cx, cy],
  };
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = (canvas.width = window.innerWidth);
const H = (canvas.height = window.innerHeight);

function section(num, width) {
  return width * 0.28 + width * (0.06 * num);
}

function getColor(x, width) {
  if (x < section(1, width)) {
    return colorsFour[0];
  } else if (x < section(2, width)) {
    return colorsFour[1];
  } else if (x < section(3, width)) {
    return colorsFour[2];
  } else if (x < section(4, width)) {
    return colorsFour[3];
  } else {
    return colorsFour[4];
  }
}

function shape(width, height, text) {
  return {
    width,
    height,
    text,
    frequency: 5,
    x: width / 2,
    y: height / 2,
    size: 140,
    lineHeight: 152,
    maxWidth: Math.round(width * 0.8),
    maxHeight: Math.round(height * 0.8),
    particles: [],
  };
}

function getValue(ctx, shape) {
  ctx.textAlign = 'center';
  ctx.font = 'normal ' + shape.size + "px 'oswald'";
  wrapText(ctx, shape.text, shape.x, shape.y, shape.maxWidth, shape.lineHeight);
  var idata = ctx.getImageData(0, 0, shape.width, shape.height);
  var buffer32 = new Uint32Array(idata.data.buffer);
  for (var y = 0; y < shape.height; y += shape.frequency) {
    for (var x = 0; x < shape.width; x += shape.frequency) {
      if (buffer32[y * shape.width + x]) {
        shape.particles.push(createParticle(0, x, y));
      }
    }
  }
  ctx.clearRect(0, 0, shape.width, shape.height);
  return shape;
}

function getSpeed(particle) {
  return Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
}

function setSpeed(heading, particle) {
  const vx = Math.cos(heading) * particle.speed;
  const vy = Math.sin(heading) * particle.speed;
  return { ...particle, vx, vy };
}

function getHeading(particle) {
  return Math.atan2(particle.vy, particle.vx);
}

function setHeading(speed, heading, particle) {
  const vx = Math.cos(heading) * speed;
  const vy = Math.sin(heading) * speed;
  return { ...particle, vx, vy };
}

function createParticle(gravity, cx, cy) {
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

function updateParticle(particle, { speed, duration }) {
  if (particle.cy < 0 || particle.r < 1) {
    const cx = particle.origin[0];
    const cy = particle.origin[1];
    const dying = false;
    const r = 1;
    const rMax = utils.randomInt(1, 6);
    const initParticle = {
      ...particle,
      cx,
      cy,
      dying,
      r,
      rMax,
      speed,
      duration,
    };
    const newParticle = setSpeed(getHeading(particle), initParticle);
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
    const cx = particle.cx + particle.vx;
    const cy = particle.cy + particle.vy;
    const vx = particle.vx * particle.friction;
    const vy = (particle.vy + particle.gravity) * particle.friction;
    if (particle.r < particle.rMax && particle.dying === false) {
      const r = particle.r + particle.duration;
      const dying = false;
      return { ...particle, cx, cy, vx, vy, r, dying, speed };
    } else {
      const r = particle.r - particle.duration;
      const dying = true;
      return { ...particle, cx, cy, vx, vy, r, dying, speed };
    }
  }
}

function updateTriangle(ctx, triangle, angle) {
  const [[ax, ay], [bx, by], [cx, cy]] = rotateTriangle(angle, triangle);
  ctx.beginPath();
  ctx.strokeStyle = '#fff';
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.closePath();
}

const startBtn = document.getElementById('start');
startBtn.addEventListener('click', theBigReveal);
const buttonWrapper = document.querySelector('.button-group');
const buttons = document.querySelectorAll('.btn--change');
buttons.forEach(btn => btn.addEventListener('click', changeGradient));

function changeGradient(e) {
  canvas.setAttribute('data-gradient', e.target.dataset.color);
}

const message = shape(W, H, "We're pregnant.");

function getStep(duration, time) {
  if (time > duration + 850) {
    return 4;
  } else if (time > duration + 750) {
    return 3;
  } else if (time > duration + 550) {
    return 2;
  } else if (time > duration + 350) {
    return 1;
  }
  return 0;
}

function update(ctx, shape, angle, steps) {
  return function(time) {
    const step = getStep(10000, time);
    setTimeout(function() {
      ctx.clearRect(0, 0, W, H);
      const [triangles, particles] = shape.particles.reduce(
        ([triangleAcc, particleAcc], particle) => [
          [...triangleAcc, fromParticle(particle)],
          [...particleAcc, updateParticle(particle, steps[step])],
        ],
        [[], []]
      );
      time > 500 &&
        triangles.forEach(triangle => updateTriangle(ctx, triangle, angle));
      requestAnimationFrame(
        update(ctx, { ...shape, particles }, angle + 5, steps)
      );
    }, 1000 / 100);
  };
}

function theBigReveal(e) {
  const steps = [
    { speed: 4, duration: 0.1 },
    { speed: 3, duration: 0.4 },
    { speed: 2, duration: 0.4 },
    { speed: 1, duration: 0.5 },
    { speed: 0, duration: 0.6 },
  ];
  update(ctx, getValue(ctx, message), 0, steps)(0);
  setTimeout(() => {
    e.target.style.display = 'none';
    canvas.style.display = 'block';
  }, 1000);
}

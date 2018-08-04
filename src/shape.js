import utils from './utils';
import triangle from './triangle';
import particle from './particle';

function create(width, height, text) {
  return {
    width,
    height,
    text,
    frequency: 5,
    x: width / 2,
    y: height / 2 - 20,
    size: 120,
    lineHeight: 132,
    maxWidth: Math.round(width * 0.8),
    maxHeight: Math.round(height * 0.8),
    particles: [],
  };
}

function getStep(duration, time) {
  if (time > duration + 850) {
    return { speed: 0, duration: 0.6 };
  } else if (time > duration + 750) {
    return { speed: 1, duration: 0.5 };
  } else if (time > duration + 550) {
    return { speed: 2, duration: 0.4 };
  } else if (time > duration + 350) {
    return { speed: 3, duration: 0.4 };
  }
  return { speed: 4, duration: 0.1 };
}

function update(angle, ctx, shape) {
  return function(time) {
    const step = getStep(10000, time);
    setTimeout(() => {
      ctx.clearRect(0, 0, shape.width, shape.height);
      const [triangles, particles] = shape.particles.reduce(
        ([triangleAcc, particleAcc], p) => [
          [...triangleAcc, triangle.fromParticle(p)],
          [...particleAcc, particle.update(step, p)],
        ],
        [[], []]
      );
      time > 500 && triangles.forEach(t => triangle.update(ctx, angle, t));
      requestAnimationFrame(
        update(angle + 5, ctx, Object.assign(shape, { particles }))
      );
    }, 1000 / 100);
  };
}

function getValue(generator, ctx, shape) {
  ctx.textAlign = 'center';
  ctx.font = 'normal ' + shape.size + "px 'oswald'";
  utils.wrapText(shape, ctx);
  var idata = ctx.getImageData(0, 0, shape.width, shape.height);
  var buffer32 = new Uint32Array(idata.data.buffer);
  for (var y = 0; y < shape.height; y += shape.frequency) {
    for (var x = 0; x < shape.width; x += shape.frequency) {
      if (buffer32[y * shape.width + x]) {
        shape.particles.push(generator({ gravity: 0, cx: x, cy: y }));
      }
    }
  }
  ctx.clearRect(0, 0, shape.width, shape.height);
  return shape;
}

const shape = {
  create,
  update,
  getValue,
};

export default shape;

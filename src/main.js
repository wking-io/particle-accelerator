import Elm from './app/Main.elm';
import './main.scss';

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

// basic setup  :)

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function shape(width, height, text) {
  return {
    width,
    height,
    text,
    frequency: 5,
    x: width / 2,
    y: height / 2 - 80,
    size: 120,
    maxWidth: Math.round(width * 0.8),
    maxHeight: Math.round(height * 0.8),
    lineHeight: 132,
    points: [],
  };
}

function getValue(ctx, shape) {
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + shape.size + 'px arial';
  wrapText(ctx, shape.text, shape.x, shape.y, shape.maxWidth, shape.lineHeight);
  var idata = ctx.getImageData(0, 0, shape.width, shape.height);
  var buffer32 = new Uint32Array(idata.data.buffer);
  for (var y = 0; y < shape.height; y += shape.frequency) {
    for (var x = 0; x < shape.width; x += shape.frequency) {
      if (buffer32[y * shape.width + x]) {
        shape.points.push([x, y]);
      }
    }
  }
  ctx.clearRect(0, 0, shape.width, shape.height);
  return shape.points;
}

var message = shape(
  canvas.width,
  canvas.height,
  "You're going to be babysitters... Oh wait, grandparents."
);

const mountNode = document.getElementById('app');
const app = Elm.Main.embed(mountNode, {
  size: {
    width: canvas.width,
    height: canvas.height,
  },
  points: getValue(ctx, message),
});

if (module.hot) {
  module.hot.accept();
}

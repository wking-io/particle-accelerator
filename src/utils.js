function degreesToRads(degrees) {
  return (degrees / 180) * Math.PI;
}

function radsToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function randomInt(min, max) {
  return min + Math.random() * (max - min + 1);
}

function wrapText({ text, x, y, maxWidth, lineHeight }, ctx) {
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

function log(x) {
  console.log(x);
  return x;
}

const utils = {
  degreesToRads,
  radsToDegrees,
  randomInt,
  wrapText,
  log,
};

export default utils;

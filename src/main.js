import shape from './shape';
import particle from './particle';

import './main.scss';

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var message = shape.create(canvas.width, canvas.height, 'Cool. Cool. Cool.');

function theBigReveal(e) {
  e.target.style.display = 'none';
  shape.update(0, ctx, shape.getValue(particle.create, ctx, message))(0);
}

const startBtn = document.getElementById('start');
startBtn.addEventListener('click', theBigReveal);

if (module.hot) {
  module.hot.accept();
}

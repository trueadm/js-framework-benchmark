'use strict';

var React = require('react');
let {render} = require('./ReactDOM');
let {Main} = require('./Main');

render(React.createElement(Main, {}), document.getElementById('main'));
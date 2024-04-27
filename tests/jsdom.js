// https://jasmine.github.io/tutorials/react_with_npm

const jsdom = require('jsdom');

const dom = new jsdom.JSDOM('<html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;


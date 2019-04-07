var assert = require('assert');
var expect = require('chai').expect;
var { replaceSharp, appendDummyElement } = require('../scripts/grid_builder.js');

describe('testing grid_builder.js', function(){
  
	it('testing replaceSharp', function(){
		/*
		* cases: "F#5","F5","Eb5"
		*/
		var str = "F#5";
		assert.equal(str.indexOf('#'), 1);
		str = replaceSharp(str);
		assert.equal(str.indexOf('#'), -1);
		
		str = "F5";		
		assert.equal(str.indexOf('#'), -1);
		str = replaceSharp(str);
		assert.equal(str.indexOf('#'), -1);
		
		str = "Eb5";
		assert.equal(str.indexOf('#'), -1);
		str = replaceSharp(str);
		expect(str.indexOf('#')).to.equal(-1);
	}); 
	
	it('testing appendDummyElement', function(){
		var el = document.createElement('div');
		el.id = 'testElement';
		document.body.appendChild(el);
		expect(document.getElementById('testElement').children.length).to.equal(0);
		appendDummyElement(el);
		expect(document.getElementById('testElement').children.length).to.equal(1);
		expect(document.getElementById('testElement').children[0].id).to.equal(1);
	});
	
 
});
const madge = require('madge');

madge('../tests/functionality - spec.js').then((res) => {
	console.log(res.obj());
});
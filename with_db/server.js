/* notes:

super helpful! https://scotch.io/tutorials/easy-node-authentication-setup-and-local
https://medium.com/@johnnyszeto/node-js-user-authentication-with-passport-local-strategy-37605fd99715
http://aleksandrov.ws/2013/09/12/restful-api-with-nodejs-plus-mongodb/
https://www.sitepoint.com/local-authentication-using-passport-node-js/
https://www.raymondcamden.com/2016/06/23/some-quick-tips-for-passport/

*/

// set up server 
var express = 			require('express');
var app = 				express();

// the order is important here!
var port = 				process.env.PORT || 3000; 
var http = 				require('http').Server(app);
http.listen(port);

var mongoose = 			require('mongoose');
var passport = 			require('passport');
var flash = 			require('connect-flash');

var cookieParser = 		require('cookie-parser');
var bodyParser = 		require('body-parser');
var session = 			require('express-session');
var assert =		    require('assert');
var mongoStore = 		require("connect-mongo");

// './' is current directory 
var configDB = require('./config/database.js');
// need to connect the database with the server! 
mongoose.connect(configDB.url);
// link up passport as well
require('./config/passport.js')(passport);

// set up the stuff needed for logins/registering users/authentication 
app.use(cookieParser()); 		// read cookies, since that is needed for authentication
app.use(bodyParser()); 			// this gets information from html forms
app.set('view engine', 'ejs');	// set view engine to ejs - templates are definitely worth it for this kind of project. 

// this is required for passport
// app.use(session({ secret: 'aweawesomeawesomeawesomesome' })); // read up on session secret 

// make a sessionMiddleware variable to link up mongoStore in order to log all the current sessions
// that way we can access all the current users and list them in the chatroom 
var sessionMiddleware = session({
	secret: 'aweawesomeawesomeawesomesome',
	store: new (mongoStore(session))({
		url: configDB.url
	})
});

app.use(sessionMiddleware);			// use the sessionMiddlware variable for cookies 			
app.use(passport.initialize());	   	// start up passport
app.use(passport.session());	    // persistent login session (what does that mean?)
app.use(flash()); 		            // connect-flash is used for flash messages stored in session.

// pass app and passport to the routes 
require('./routes/routes.js')(app, passport);

// set directory path so the piano roll (index.ejs) will know where to look to find the required javascript files 
var parentDir = (__dirname).split("\\");
parentDir = parentDir.slice(0, parentDir.length - 1); // remove last part of path, because that's the current directory 
parentDir = parentDir.join("\\"); // rejoin the array elements 
console.log(parentDir);
app.use(express.static(parentDir));


http.listen(port, function(){
	console.log('listening on *:' + port);
});


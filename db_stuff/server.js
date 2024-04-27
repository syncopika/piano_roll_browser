/* notes:
super helpful! https://scotch.io/tutorials/easy-node-authentication-setup-and-local
https://medium.com/@johnnyszeto/node-js-user-authentication-with-passport-local-strategy-37605fd99715
http://aleksandrov.ws/2013/09/12/restful-api-with-nodejs-plus-mongodb/
https://www.sitepoint.com/local-authentication-using-passport-node-js/
https://www.raymondcamden.com/2016/06/23/some-quick-tips-for-passport/
*/

// set up server 
const express =           require('express');
const app     =           express();

// the order is important here!
const port    =           process.env.PORT || 3000; 
const http    =           require('http').Server(app);
const mongoose =          require('mongoose');
const passport =          require('passport');
const flash    =          require('connect-flash');

const cookieParser =      require('cookie-parser');
const session      =      require('express-session');
const assert       =      require('assert');
const mongoStore   =      require("connect-mongo");

const configDB = require('./config/database.js');
mongoose.connect(configDB.url);
require('./config/passport.js')(passport);

app.use(cookieParser());

// body parser provided by express (no need for body-parser lib)
app.use(express.urlencoded({extended: false}));

app.set('view engine', 'ejs');

// this is required for passport
// TODO: read up on session secret 

// make a sessionMiddleware variable to link up mongoStore in order to log all the current sessions
// that way we can access all the current users and list them in the chatroom 
const sessionMiddleware = session({
  secret: 'aweawesomeawesomeawesomesome',
  store: mongoStore.create({
    mongoUrl: configDB.url
  }),
  resave: false,
  saveUninitialized: false,
});

app.use(sessionMiddleware);            // use the sessionMiddlware variable for cookies             
app.use(passport.initialize()); 
app.use(passport.session());           // persistent login session (what does that mean?)
app.use(flash());                      // connect-flash is used for flash messages stored in session.

// pass app and passport to the routes 
require('./routes/routes.js')(app, passport);

// set directory path so the piano roll (index.ejs) will know where to look to find the required javascript files 
// since this project is a nested directory and I want to reference my script folder outside it, I need to do this.
// this treats the crrent directory's parent as the root directory 
let parentDir = (__dirname).split("\\");
parentDir = parentDir.slice(0, parentDir.length - 1).join("\\");
app.use(express.static(parentDir));


http.listen(port, function(){
  console.log('listening on *:' + port);
});

// these are all the functions that handle routes (i.e. POST, GET, DELETE)
// all of these routes will be controlled by passport for ensuring proper access for users
// super helpful! https://scotch.io/tutorials/easy-node-authentication-setup-and-local

// load user model
var User = require('../models/user.js');

module.exports = function(app, passport){

	// this will serve the login page to the user first!
	// if login is successful, then the server can serve the chat page
	app.get('/', function(req, res){
		res.render('login.ejs', { message: "" });
	});
	
	// show the login page 
	app.get('/login', function(req, res){
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});
	
	// when server receives a POST request to /login, need to check form input 
	// and authenticate 
	app.post('/login', passport.authenticate('local-login', {
		failureRedirect: '/login',
		failureFlash: true
	}), function(req, res){
		// go to piano roll via 'get /pianoRoll'
		res.redirect('/pianoRoll/');
	});
	
	// show the register page 
	app.get('/register', function(req, res){
		res.render('register.ejs', { message: req.flash('registerMessage') });	
	});
	
	// take care of registering user after form input has been submitted 
	app.post('/register', passport.authenticate('local-register', {
		successRedirect: '/pianoRoll', // go to profile for user (goes to piano roll for now)
		failureRedirect: '/register',
		failureFlash: true
	}));
	
	// direct to piano roll, with pianoRoll in the url
	app.get('/pianoRoll', function(req, res){
		res.render('index.ejs', {
			user: req.user 	// get user name from session and pass to template
		});
	});
	
	// add  ROUTE FOR ACCESSING USER PROFILE!
	app.get('/profile', function(req, res){
		res.render('profile.ejs', {
			user: req.user 
		});
	});
	
	// if user updates their profile 
	app.post('/profile', function(req, res){
		// get the info as supplied by the url query 
		var locationInfo = req.query.location.trim();
		var aboutInfo = req.query.about.trim();

		// update the database 
		var user = req.user.local.username;
	
		User.findOneAndUpdate({'local.username': user},
							{
							 '$set': {'local.location': locationInfo, 'local.about': aboutInfo},
							},
							{new: true, upsert: true},
							function(err, user){
								if(err){
									throw err;
								}
								res.send(user);
							}
		);	
	});
	
	// if user wants to save current score to db 
	app.post('/save_score', function(req, res){
		
		// get the user 
		var user = req.user.local.username;
		// get the score (the body attribute is holding the json data)
		// careful - the req.body is actually an object where the data is mapped to "score", the name you gave 
		// for the query attribute when making the post request 
		
		var score = req.body;
		var scorejson = [JSON.parse(score.score)];
		
		// put it in the db 
		User.findOneAndUpdate({'local.username': user},
							// add the new score to the array "scores"
							// BUT WHAT ABOUT UPDATING A SCORE THAT WAS ALREADY IN THE ARRAY!?
							// no problem, use $pull to remove it if it's there (the old version), then add the new one 
							{
								 // this is broken. the best fix is to probably reformat your score json!!!! 
								 // i don't think it's very beneficial to have the metadata in a separate object anyway. 
								'$pull': {"local.scores.$.title": scorejson[0].title},
								'$push': {"local.scores": scorejson}
							}, 
							{new: true, upsert: true},
							function(err, user){
								if(err){
									throw err;
								}
								res.send(user);
							}
		);
	});
	
	// retrieve requested score from user's scores list 
	app.get('/get_score', function(req, res){
		
		// get user 
		var user = req.user.local.username;
		
		// get the name of the score requested 
		var scoreName = req.query.name;
	
		// look for the score 
		User.find({'local.username': user},
					function(err, cursor){
								if(err){
									throw err;
								}
								res.send(cursor);
					});
	
	});
	
	// show logout page 
	// https://stackoverflow.com/questions/13758207/why-is-passportjs-in-node-not-removing-session-on-logout
	app.get('/logout', function(req, res){
		// remove username from current users list 
		req.logout(); 			// this is a passport function
		res.redirect('/');  	// go back to home page 
	});
	
	// middleware function to make sure user is logged in
	function isLoggedIn(req, res, next){
		
		// if user is authenticated, then ok
		if(req.isAuthenticated()){
			return next();
		}

		// if not authenticated, take them back to the home page 
		res.redirect('/');
	}
	
}
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
		successRedirect: '/pianoRoll',
		failureRedirect: '/login',
		failureFlash: true
	})
	);
	
	// show the register page 
	app.get('/register', function(req, res){
		res.render('register.ejs', { message: req.flash('registerMessage') });
	});
	
	// take care of registering user after form input has been submitted 
	app.post('/register', passport.authenticate('local-register', {
		successRedirect: '/pianoRoll', // go to profile for user instead? (goes to piano roll for now)
		failureRedirect: '/register',
		failureFlash: true
	})
	);
	
	// direct to piano roll, with pianoRoll in the url
	app.get('/pianoRoll', function(req, res){
		if(req.user){
			res.render('index.ejs', {
				user: req.user 	// get user name from session and pass to template
			});
		}else{
			res.render('forbidden.ejs');
		}
	});
	
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
	
		User.findOneAndUpdate(
			{'local.username': user},
			{
			 $set: {
				 'local.location': locationInfo, 
				 'local.about': aboutInfo
			  },
			},
			{
				new: true, 
				upsert: true
			},
			function(err, user){
				if(err){
					throw err;
				}
				res.send(user);
			}
		);
	});
	
	// if user wants to save current score to db 
	function contains(array, titleToFind){
		for(var i = 0; i < array.length; i++){
			if(array[i].title.trim() === titleToFind.trim()){
				return true;
			}
		}
		return false;
	}
	
	app.post('/save_score', function(req, res){
		// get the user 
		var user = req.user.local.username;
		
		// get the score (the body attribute is holding the json data)
		// careful - the req.body is actually an object where the data is mapped to "score", the name you gave 
		// for the query attribute when making the post request 
		var body = req.body;
		var scorejson = JSON.parse(body.score);
		
		// if score exists, update the note data (via the instruments field). otherwise, add it.
		User.updateOne(
			{'local.username': user, 'local.scores.title': scorejson.title}, // conditions to find 
			{$set: {'local.scores.$.instruments': scorejson.instruments}},	// what to do when found 
			{},
			function(err, result){
				if(err){
					throw err;
				}
				if(result.modifiedCount === 0){
					// nothing was modified, so score is new. push it to the scores array
					//console.log("need to add new score!");
					User.updateOne({'local.username': user},
						{$push: {"local.scores": [scorejson]}}, 
						{upsert: true},
						function(err, result){
							if(err){
								throw err;
							}
							res.send(result);
						}
					);
					
				}else{
					//console.log(result);
					res.send(result);
				}
			}	
		);
		
	});
	
	// retrieve requested score from user's scores list 
	app.get('/get_score', function(req, res){
		
		// get user 
		var user = req.user.local.username;
		
		// get the name of the score requested 
		var scoreName = req.query.name;
	
		// look for the score (this is actually returning the whole user! :O maybe not a good idea...)
		User.find(
			{'local.username': user},
			function(err, user){
				if(err){
					throw err;
				}
				res.send(user);
			}
		);
	});
	
	// delete a score (this option is selected from the user's profile page)
	app.delete('/delete_score', function(req, res){
		var user = req.user.local.username;
		var scoreToDelete = req.query.name;
		
		// delete the score 
		User.updateOne(
			{'local.username': user, 'local.scores.title': scoreToDelete},
			{$pull: {'local.scores': {'title': scoreToDelete}} }, 
			{},
			function(err, user){
				if(err){
					throw err;
				}
				res.send("success");
			}
		);
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
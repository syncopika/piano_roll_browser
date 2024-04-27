// configure the passport strategy for local authentication 
// using the passport object created in server.js
// see if can keep session even after refresh:
// https://stackoverflow.com/questions/29721225/staying-authenticated-after-the-page-is-refreshed-using-passportjs

const LocalStrategy = require('passport-local').Strategy;

// load user model
const User = require('../models/user.js');

// expose the following function to rest of application
module.exports = function(passport){
    
  // setup passport session
  // required for persistent login sessions! (what is a persistent login session?)
  // passport needs to serialize and unserialize users out of sessions
    
  // serialize the user for the session
  passport.serializeUser(function(user, done){
    done(null, user.id);
  });
    
  // unserialize the user 
  passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
      done(err, user);
    });
  });
    
  /****
    
        this section takes care of registering new users 
    
    ****/
  passport.use('local-register', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true // this allows the entire request to be passed to the function below
  },
  function(req, username, password, done){
    // this is an asynchronous step
    // User.findOne won't execute unless data is sent back 
    process.nextTick(function(){
            
      // see if there is another user already with the same username 
      User.findOne({ 'local.username' : username }, function(err, user){ 
                
        // if any errors, return the error 
        if(err){
          console.log("error!: " + err);
          return done(err);
        }
                
        // if there is a user with the same username already, show an error message
        if(user){
          return done(null, false, req.flash('registerMessage', 'Sorry, that username already exists')); // check template for register error message!
        }else{
          //console.log("creating a new user with username: " + newUser.local.username + ", password: " + newUser.local.password);
          // if no user with given username, create the new user 
          const newUser = new User();
                    
          // set user's local credentials 
          newUser.local.username = username;
          newUser.local.password = newUser.generateHash(password);
          newUser.local.about = "";
          newUser.local.location = "Unknown";
                    
          // get the current date (M/D/YYYY)
          const currDate = new Date();
          // add 1 to month because it only goes 0-11
          newUser.local.joinDate = (currDate.getMonth()+1) + "/" + currDate.getDate() + "/" + currDate.getFullYear();
                    
          newUser.local.scores = [];
                    
          // save the user in the database
          newUser.save(function(err){
            if(err){
              console.log("error!: " + err);
              throw err;
            }
            return done(null, newUser);
          });
        }
      });
    });
        
  }));
    
  /****
    
        this section takes care of local login
    
    ****/
  passport.use('local-login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  },
  function(req, username, password, done){ // callback with username and password from form 

    User.findOne({'local.username' : username}, function(err, user){
      if(err){
        return done(err);
      }
            
      // if no user found, return error message 
      if(!user){
        // req.flash sets flashdata using connect-flash
        return done(null, false, req.flash('loginMessage', 'Sorry, that user is not registered!'));
      }
            
      // if user is found but password incorrect
      if(!user.validPassword(password)){
        return done(null, false, req.flash('loginMessage', 'Wrong password!'));
      }
            
      // success, return user
      return done(null, user);
    });
  }));
    
    
};
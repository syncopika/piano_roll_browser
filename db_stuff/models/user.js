// user model FOR PIANO ROLL APP 

// required tools 
var mongoose =     require('mongoose');
var bcrypt      =     require('bcryptjs');

// define schema for user model.
// only handling local authentication
var userSchema = mongoose.Schema({
    local: {
        username: String,
        password: String,
        about: String,
        location: String,
        joinDate: String,
        scores: Array // an array of JSON files corresponding to scores 
    }
});


// some important methods! --------------------------

// generate a hash with a given password.
userSchema.methods.generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
}

// check if a password is valid (i.e. don't allow certain characters)
userSchema.methods.validPassword = function(password){
    return bcrypt.compareSync(password, this.local.password);
}

// create the user model and expose it to the application
// IMPORTANT!!!
// this mongoose.model looks for the collection 'userData', since I supplied it as an argument
// it will use this collection to insert new users 
// https://stackoverflow.com/questions/7486528/mongoose-force-collection-name/7722490#7722490
module.exports = mongoose.model('User', userSchema, 'userData'); 
'use strict';

var express = require('express');
const path = require('path')
const nunjucks = require('nunjucks');
const logger = require('morgan');
const bodyParser = require('body-parser');
//Import the mongoose module- mongoose is a MongoDB Object Modelling Tool
var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

//Set up default mongoose connection
var mongoDB = 'mongodb://127.0.0.1/my_database';
mongoose.connect(mongoDB, { useMongoClient: true });

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// --------------MODELS------------------


//Define  schema //sample one was userSchema
var patient_data = new mongoose.Schema({
  name: String,
  age:{
      type: Number,
      required:true,
  },
  phone_number: Number,
  postal_address: String,
  doctor_comments:{
      type: String,
      required: true,
  },
  patient_history: String,
  video_link:String,
  remote_centre_ID:{
      type: mongoose.Schema.Types.ObjectId,
      required: true,
}
});

var IVF_centres = new mongoose.Schema({
    doctor_name: String,
    address: String,
    phone_number: Number,
    remote_centre_ID: [mongoose.Schema.Types.ObjectId],
    hash: String,
    salt: String
});

var remote_centres = new mongoose.Schema({
    name: String,
    address: String,
    phone_number: Number,
    IVF_ID: mongoose.Schema.Types.ObjectId,
    hash: String,
    salt: String
});

// -------------MODELS END HERE-------------

// var MyModel = mongoose.model('MyModel', MyModelSchema );
mongoose.model('patient_data',patient_data);
mongoose.model('IVF_centres',IVF_centres);
mongoose.model('remote_centres',remote_centres);  //A model is a class with which we construct documents. Hence here we define models.
                                                //right arguments are schema while left arguments are models.
// mongoose models..
var DB = mongoose.model('patient_data');
// Generating password
remote_centres.methods.setPassword = function(password){
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};
IVF_centres.methods.setPassword = function(password){
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

// Checking password
remote_centres.methods.validPassword = function(password) {
  var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
  return this.hash === hash;
};
IVF_centres.methods.validPassword = function(password) {
  var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
  return this.hash === hash;
};
// JWT Stuff
remote_centres.methods.generateJwt = function() {
  var expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  return jwt.sign({
    _id: this._id,
    email: this.email,
    name: this.name,
    exp: parseInt(expiry.getTime() / 1000),
  }, "MY_SECRET"); // DO NOT KEEP YOUR SECRET IN THE CODE!
};

var app = express();
var port = 8080;
var Users = [];
// For logging
app.use(logger('dev'));
// static files
app.use('/static', express.static(path.join(__dirname, 'public')));
// Body Parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.use('views', express.static(__dirname + '/views'));

nunjucks.configure(path.join(__dirname, '/views'), {
    autoescape: true,
    cache: false,
    express: app
});

app.use('/protected_page', function(err, req, res, next){
    console.log(err);
    res.redirect('/');
});

app.get('/', function(req,res){
    res.render('index.html');
});

app.get('/login', function(req,res){
    res.render('login.html');
});

app.post('/login', function(req, res){
   console.log(Users);
   if(!req.body.email || !req.body.password){
      res.render('login.html', {message: "Please enter both id and password"});
   } else {
      Users.filter(function(user){
         if(user.email === req.body.email && user.password === req.body.password){
            req.session.user = user;
            res.redirect('/protected_page');
         }
      });
      res.render('login.html', {message: "Invalid credentials!"});
   }
});

app.get('/logout', function(req, res){
   req.session.destroy(function(){
      console.log("user logged out.")
   });
   res.redirect('/login');
});

// app.post('/login', function(req, res){
//   const { email, password } = req.body || {};
//   // console.log(req.body);
//   // res.send(`I've got a POST with request body: ${email}, ${password}`);
//   res.redirect('/');
// });
app.get('/entries', function(req,res){
    res.render('forms.html');
});

app.listen(port, function(){
    console.log("App is running at "+ port);
});

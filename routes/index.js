var express = require('express');
var router = express.Router();
var CryptoJS= require('crypto-js');

var log4js = require('log4js');
var logger = log4js.getLogger();

var Db = require('mongodb').Db,
MongoClient = require('mongodb').MongoClient,
Server = require('mongodb').Server,
ReplSetServers = require('mongodb').ReplSetServers,
ObjectID = require('mongodb').ObjectID,
Binary = require('mongodb').Binary,
GridStore = require('mongodb').GridStore,
Grid = require('mongodb').Grid,
Code = require('mongodb').Code,
assert = require('assert');

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
   var db = req.db;
   var collection = db.get('usercollection');
   collection.find({},{},function(e,docs){
      res.render('userlist', {
         "userlist" : docs
      });
   });
});

/* GET home page. */
router.get('/', function(req, res, next) {
   res.render('index', { title: 'Express' });
});

/* POST to Add User Service */
router.post('/adduser',adduserFunction);

/* GET New User page. */
router.get('/newuser', function(req, res) {
   res.render('newuser', { title: 'Add New User' });
});

function adduserFunction(req, res) {

   // Set our internal DB variable
   var db = req.db;

   // Get our form values. These rely on the "name" attributes
   var userName = String(req.body.username);
   var userPassword = String(req.body.userpassword);
   var userRepeatPassword = String(req.body.userrepeatpassword);

   var reg = /^[a-zA-ZąćęłńóśżźĄĆĘŁŃÓŚŻŹ]{2,20}$/;

   if((userName.match(reg)) && (!userPassword=="") && (userPassword==userRepeatPassword) ){

      // Set our collection
      var collection = db.get('usercollection');

      collection.count({"username" : userName},function(err, count){
         if(count==0){
            var userid=0;
            collection.count({},function(err, count){
               userid = count+1;
               // Submit to the DB
               collection.insert({
                  "userid" : userid,
                  "userstatus" : "A",  //user is active
                  "username" : userName,
                  "userregdate" : new Date(),
                  "userpassword" : String(CryptoJS.SHA3(userPassword))
               }, function (err, doc) {
                  if (err) {
                     // If it failed, return error
                     var ecom = "There was a problem during adding the information to the database.";
                     res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                     return;
                  }
                  else {
                     // If it worked, set the header so the address bar doesn't still say /adduser
                     res.location("/");
                     // And forward to success page
                     res.redirect("/");
                  }
               });
            });
         }
         else
         {var ecom = "Account already exists.";
         res.render('newuser', { "error" : ecom });}
      });
   }
   else
   {var ecom = "Incorrect data. Please try again!";
   res.render('newuser', { "error" : ecom });}
}

/* Logout Function */
router.get('/logout', function(req, res){
   req.session.reset();
   res.redirect('/');
});

/* GET to Verify Sign In Service */
router.get('/profile', profileFunction);

/* POST to Verify Sign In Service */
router.post('/profile', profileFunction);

function profileFunction(req, res){
   // Set our internal DB variable
   var db = req.db;

   if(req.body.username != undefined ){
      var userName = req.body.username;
      var userPassword = req.body.userpassword;
      userPassword = String(CryptoJS.SHA3(userPassword));
      var cookieSet = false;

   }
   else {
      if( req.session.user ){
        var userName = req.session.user.username;
        var userPassword = req.session.user.userpassword;
        var cookieSet = true;
        }
        else {
           res.render('index', { title: 'SCRUM APP' });
        }
   }

   // Set our collection
   var collection = db.get('usercollection');

   collection.findOne({"username" : userName,"userstatus" : {$in : ["A","N"]}, "userpassword" : userPassword },function(err, user){

      if(user!=null){
         if(cookieSet == false) req.session.user = user;

         res.render('profile', {
            title: 'Your Profile',
            "profile" : user,
         });
      }
      else
      {
         var ecom = "Incorrect data. If you don't have an account - Sign up";
         res.render('index', { "error" : ecom });
      }
   });
};

/* GET Creator page. */
router.get('/creator', function(req, res) {
    res.render('creator', { title: 'Project Creator'});
});

module.exports = router;

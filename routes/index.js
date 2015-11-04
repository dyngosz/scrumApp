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
         //   res.render('index', { title: 'SCRUM APP' });
      }
   }

   // Set our collection
   var collection = db.get('usercollection');

   collection.findOne({"username" : userName,"userstatus" : {
      $in : ["A","N"]}, "userpassword" : userPassword },function(err, user){

         if(user!=null){
            if(cookieSet == false) req.session.user = user;

            var collection2 = db.get('projectcollection');
            collection2.find({ "projectowner" : userName},function(e,docs2) {
               var list = [];
               for (i=0; i<docs2.length; i++) {

                  list[list.length] = parseInt(docs2[i].projectid);
               }
               res.render('profile', {
                  title: 'Your Profile',
                  "profile" : user,
                  "projects" : docs2,
               });
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

   /* POST to Add Project */
   router.post('/addproject', function(req, res) {

      var username = req.session.user.username;
      var projectname = req.body.projectname;

      var db = req.db;
      var collection = db.get('projectcollection');
      collection.count({},function(err, count){
         projectid = count+1;
         // Submit to the DB
         collection.insert({
            "projectname" : projectname,
            "projectowner" : username,
            "projectid" : projectid
         }, function (err, doc) {
            if (err) {
               // If it failed, return error
               var ecom = "There was a problem during adding the information to the database.";
               res.render('errorpage', { "error" : ecom, "page" : "/profile" });
               return;
            }
            else {
               // If it worked, set the header so the address bar doesn't still say /adduser
               res.location("/profile");
               // And forward to success page
               res.redirect("/profile");
            }
         });
      });

   });

   /*Link to project*/
   router.get('/project', function(req, res){


      var projectid = req.query['id'];
      if(projectid == undefined || projectid == ""){
         var ecom = "There is no project with this number";
         res.render('errorpage', { "error" : ecom, "page" : "/profile" });
         return;
      }
      var db = req.db;
      // Get our form values. These rely on the "name" attributes
      if(!req.session.user){
         // If it worked, set the header so the address bar doesn't still say /adduser
         res.location("/");
         // And forward to success page
         res.redirect("/?project="+projectid);
         return;
      }
      else {
         var userName = req.session.user.username;
         var userPassword = req.session.user.userpassword;
      }
      // Set our collection
      var collection = db.get('usercollection');

      collection.find({"username" : userName,"userstatus" : {$in : ["A","N"]},
      "userpassword" : userPassword },function(err, find){

            var collection2 = db.get('projectcollection');
            collection2.find({"projectid" : parseInt(projectid)}, { "projectname" : 1 }, function(err,doc){
               if(doc[0]==undefined || doc[0]==""){
                  var ecom = "Wrong number of project";
                  res.render('errorpage', { "error" : ecom, "page" : "/profile" });
                  return;
               }

               var collection3 = db.get('sprintInProjectCollection');
               collection3.find({"projectid" : parseInt(projectid)}, { "sprintname" : 1 }, function(err,sprints){
                  //  logger.debug(sprints);
                  var list = [];
                  for (i=0; i<sprints.length; i++) {
                     list[list.length] = parseInt(sprints[i].sprintid);
                  }
                  logger.debug(list);
                  var collection4 = db.get('taskInSprintCollection');
                  collection4.find({"sprintid" : {$in: list}},{"projectid":parseInt(projectid)}, function(err,tasks){
                     logger.debug('tasks ' + tasks[0]);
                     res.render('project', {
                        "project" : doc,
                        "sprints" : sprints,
                        "tasks": tasks
                     });
                  });
               });
            });
      });
   });

   /* GET SprintCreator page. */
   router.get('/sprintcreator', function(req, res) {
      res.render('sprintcreator', {
         title: 'Sprint Creator',
         'projectid': parseInt(req.query['id'])
      });
   });

   /* POST to Add Sprint */
   router.post('/addsprint', function(req, res) {

      var username = req.session.user.username;
      var projectid = parseInt(req.body.projectid);
      var sprintname = req.body.sprintname;
      var sprintstartdate = req.body.sprintstartdate;
      var sprintenddate = req.body.sprintenddate;

      var db = req.db;
      var collection = db.get('sprintInProjectCollection');
      collection.count({},function(err, count){
         sprintid = count + 1;
         // Submit to the DB
         collection.insert({
            "projectid": projectid,
            "sprintid": sprintid,
            "sprintname" : sprintname,
            "sprintstartdate" : sprintstartdate,
            "sprintenddate" : sprintenddate
         }, function (err, doc) {
            if (err) {
               // If it failed, return error
               var ecom = "There was a problem during adding the information to the database.";
               res.render('errorpage', { "error" : ecom, "page" : "/profile" });
               return;
            }
            else {
               // If it worked, set the header so the address bar doesn't still say /adduser
               res.location("/project?id="+projectid);
               // And forward to success page
               res.redirect("/project?id="+projectid);
            }
         });
      });
   });

   /* GET TaskCreator page. */
   router.get('/taskcreator', function(req, res) {
      res.render('taskcreator', {
         title: 'Task Creator',
         'sprintid': parseInt(req.query['id']),
         'projectid': parseInt(req.query['pid'])
      });
   });

   /* POST to Add Sprint */
   router.post('/addtask', function(req, res) {

      var username = req.session.user.username;
      var sprintid = parseInt(req.body.sprintid);
      var projectid = parseInt(req.body.projectid);
      var taskname = req.body.taskname;
      var taskdescription = req.body.taskdescription;
      var taskpoints = req.body.taskpoints;

      var db = req.db;
      var collection = db.get('taskInSprintCollection');
      collection.count({},function(err, count){
         taskid = count + 1;
         // Submit to the DB
         collection.insert({
            "projectid": projectid,
            "sprintid": sprintid,
            "taskid": taskid,
            "taskname" : taskname,
            "taskdescription" : taskdescription,
            "taskpoints" : taskpoints
         }, function (err, doc) {
            if (err) {
               // If it failed, return error
               var ecom = "There was a problem during adding the information to the database.";
               res.render('errorpage', { "error" : ecom, "page" : "/profile" });
               return;
            }
            else {
               // If it worked, set the header so the address bar doesn't still say /adduser
               res.location("/project?id="+projectid);
               // And forward to success page
               res.redirect("/project?id="+projectid);
            }
         });
      });
   });

   module.exports = router;

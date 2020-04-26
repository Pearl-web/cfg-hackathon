const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { Router } = express; //Here we destructure (ES6) the Router value off of express
const router = Router();
const getQueries = require('../queries/getQueries.js');
const postQueries = require('../queries/postQueries.js');
const dbConnection = require('../../db_server/db_connection');


//Handles routes for get tasks in dashboard.html
router.get('/view-task', function(request, response) {
    const postcode = request.session.loggedinUser.postcode;
    dbConnection.query('SELECT * FROM tasks WHERE neighbourhoodId = $1', [postcode],
        function(error, results) {
            if (results.rows.length > 0) {
                console.log(results.rows)
                var tasks = results.rows;
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify(tasks));
            } else {
                //TODO: this should be done client side
                console.log('No tasks for your neighbourhood');
            }
        })
});

//Handles route for posttaskform in dashboard.html
router.post('/submit-task', function(request, response) {
    var taskDetails = ({
        ownerId: request.session.loggedinUser.id,
        neighbourhoodId: request.session.loggedinUser.postcode,
        titleContent: request.body.task,
        descriptionContent: request.body.description
    });
    console.log("From /submit-task " + taskDetails.neighbourhoodId);
    //insert task into db along with users details
    postQueries.addNewTask(taskDetails, err => {
        if (err) return serverError(err, response);
        response.writeHead(302, { 'Location': '/my-dashboard' });
        response.end()
    });
    response.redirect('/my-dashboard');
})

//Handles route for dashboard
router.get('/my-dashboard', function(request, response) {
    if (request.session.loggedin) {
        return response.sendFile(path.join(__dirname, '..', '..', 'public', 'dashboard.html'));
    } else {
        response.send('please log in to view this page');
    }
});

//Helper method - handles get user neighbourhood xhr request from main.js
router.get('/neighbourhood', function(request, response) {
    console.log("From /neighbourhood req" + request.session.loggedinUser.postcode);
    var postcodeAPIURL = "https://api.postcodes.io/postcodes/" + request.session.loggedinUser.postcode;
    fetch(postcodeAPIURL)
        .then(response => response.json())
        .then(data => {
            const wardname = data.result['admin_ward'];
            const admindistrict = data.result['admin_district']
                //pass in user as a session.loggedInUser
            const user = request.session.loggedinUser;
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(area = { wardname, admindistrict, user }));
        })
        .catch(error => console.log('error:', error));
});

//Handles post form in create-user.html - create new user
//TODO: check email isnt in use
router.post('/adduser', function(request, response) {
    //format postcode
    var postcode = (request.body.postcode).toUpperCase().split(" ").join("");
    newUser = ({
        fullname: request.body.name,
        email: request.body.email,
        password: request.body.password,
        phonenumber: request.body.phone,
        postcode: request.body.postcode,
    });
    console.log("From /adduser " + request.body.name);
    postQueries.addNewUser(newUser, err => {
        if (err) return serverError(err, response);
        response.writeHead(302, { 'Location': '/' });
        response.end()
    });
    response.redirect('/login');
});

//Handles post form in login.html - checks user exits
//TODO: password bcrypt
router.post('/authoriseuser', function(request, response) {
    const username = request.body.username;
    const password = request.body.password;
    console.log("/authorise " + username + password);
    dbConnection.query('SELECT * FROM users WHERE email = $1 and password = $2', [username, password],
        function(error, results, fields) {
            console.log(results.rows);
            if (results.rows.length > 0) {
                request.session.loggedin = true;
                request.session.loggedinUser = {
                    id: results.rows[0].id,
                    fullname: results.rows[0].fullname,
                    email: results.rows[0].email,
                    phonenumber: results.rows[0].phonenumber,
                    postcode: results.rows[0].postcode
                }
                response.redirect('/my-dashboard');
            } else {
                response.send('Oops. Incorrect login details.');
            }
        })
});

//Handles log out request
router.get('/logout', function(req, res) {
    console.log('Destroying session');
    req.session.destroy();
    res.redirect('/');
});

//Handles the route for the login path
router.get('/login', function(request, response) {
    response.sendFile(path.join(__dirname, '..', '..', 'public', 'login.html'));
});

//Handles the route for the signup path
router.get('/create-user', function(request, response) {
    response.sendFile(path.join(__dirname, '..', '..', 'public', 'create-user.html'));
});

//Handles the route for the home path
router.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

//Handles the route for the error path
router.get('/error', function(request, response) {
    response.writeHead(404, { 'content-type': 'text/html' });
    response.end('<h1>Ooops somethings broken ...</h1>');
});

module.exports = router;
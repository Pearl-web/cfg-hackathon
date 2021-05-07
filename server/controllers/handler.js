const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { Router } = express; //Here we destructure (ES6) the Router value off of express
const router = Router();
const postQueries = require('../queries/postQueries.js');
const dbConnection = require('../../db_server/db_connection');
console.log(dbConnection)


//Handles button in dashboard.html - user completes a request
router.post('/complete-request', function(request, response) {
    console.log('from /complete-request ' + request.body.taskid);
    var taskid = request.body.taskid;
    postQueries.setTaskCompleted(taskid, err => {
        if (err) return serverError(err, response);
        response.writeHead(302, { 'Location': '/my-dashboard' });
        response.end()
    });
    response.redirect('/my-dashboard');
})

//Handles form in dashboard.html - user accepts request
router.post('/accept-request', function(request, response) {
    console.log('from /accept-request ' + request.body.taskid + request.session.loggedinUser.id);
    var accepetedTask = {
        repliedtouserid: request.session.loggedinUser.id,
        repliedtousername: request.session.loggedinUser.fullname,
        repliedtousernumber: request.session.loggedinUser.phonenumber,
        taskid: request.body.taskid,
    }

    //insert accepted users id into this task
    postQueries.setTaskAccepted(accepetedTask, err => {
        if (err) return serverError(err, response);
        response.writeHead(302, { 'Location': '/my-dashboard' });
        response.end()
    });
    response.redirect('/my-dashboard');
})

//Handles routes for get tasks in dashboard.html
router.get('/view-task', function(request, response) {
    const postcode = request.session.loggedinUser.postcode;
    dbConnection.query('SELECT * FROM tasks WHERE neighbourhoodId = $1', [postcode],
        function(error, results) {
            if (results.rows.length > 0) {
                console.log(results.rows)
                var taskInfo = results.rows;
                var loggedinUserId = request.session.loggedinUser.id;
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify(tabledetails = { taskInfo, loggedinUserId }));
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
        ownernumber: request.session.loggedinUser.phonenumber,
        ownername: request.session.loggedinUser.fullname,
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
    var formattedPostcode = (request.body.postcode).toUpperCase().split(" ").join("");
    newUser = ({
        fullname: request.body.name,
        email: request.body.email,
        password: request.body.password,
        phonenumber: request.body.phone,
        postcode: formattedPostcode,
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
    //format postcode
    const username = request.body.username;
    const password = request.body.password;
    console.log("/authorise " + username + password);
    dbConnection.query(`SELECT * FROM users WHERE email = $1 and password = $2`, [username, password],
        //dbConnection.query(`SELECT * FROM users WHERE email = '${username}' and password = '${password}'`, // [username, password],
        function(error, results) {
            //(error, results) => {
            if (error) {
                console.log("error: ", error);
                return;
            }

            if (results.rows.length > 0) {
                var formattedPostcode = (results.rows[0].postcode).toUpperCase().split(" ").join("");
                request.session.loggedin = true;
                request.session.loggedinUser = {
                    id: results.rows[0].id,
                    fullname: results.rows[0].fullname,
                    email: results.rows[0].email,
                    phonenumber: results.rows[0].phonenumber,
                    postcode: formattedPostcode
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
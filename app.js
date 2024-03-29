const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const pool = require('./database');
const { sign } = require('crypto');

let homePage = 'login';
let userLogin = {
	status: false,
	message: ''
}

let del = {
	message: ''
}

let userSignup = {
	status: false,
	message: ''
}

let currentUser;

app.set('view engine', 'ejs');
app.set('views', './views');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', async (req, res) => {
	del.message = '';
	if(userLogin.status == true) {
		// currentUser = await pool.query(`SELECT * FROM users WHERE username = '${currentUser}' ORDER BY id`);
		console.log(currentUser);
		let note_1 = await pool.query(`SELECT * FROM notes WHERE userid = ${currentUser.id} ORDER BY id`);
		let noteList = note_1.rows;
		let data = {
			noteList: noteList,
			username: currentUser.username
		}
		// noteList[0].username = currentUser.username;
		console.log('user logged in');
		res.render('index', {data});
		// res.send('Homepage');
	}
	else if(homePage == 'signup') {
		res.render('signup', {userSignup});
	}
	else {
		console.log('user not logged in');
		res.render('login', {userLogin});
	}
});

app.get('/signup_form', (req, res) => {
	homePage = 'signup';
	userLogin = {
		status: false,
		message: ''
	}
	res.redirect('/');
});

app.get('/login_form', (req, res) => {
	homePage = 'login';
	userSignup = {
		status: false,
		message: ''
	}
	res.redirect('/');
});

app.post('/login', async (req, res) => {
	loginData = req.body;
	let userData = await pool.query(`SELECT * FROM users WHERE username = '${loginData.username}'`);
	let user = userData.rows[0];
	if(user == undefined) {
		userLogin.status = false;
		userLogin.message = `User ${loginData.username} does not exist`;
		res.redirect('/');
	}
	else if(user.password == loginData.password) {
		userLogin.status = true;
		userLogin.message = '';
		currentUser = user;
		res.redirect('/');
	}
	else {
		userLogin.status = false;
		userLogin.message = 'Incorret password';
		res.redirect('/');
	}
})

app.post('/signup', async (req, res) => {
	signupData = req.body;
	let userData = await pool.query(`SELECT * FROM users WHERE username = '${signupData.username}'`);
	let user = userData.rows[0];
	if(user != undefined) {
		userSignup.status = false;
		userSignup.message = `User ${signupData.username} already exists`;
		res.redirect('/');
	}
	else if(signupData.password != signupData.confirm_password) {
		userSignup.status = false;
		userSignup.message = `Passwords don't match`;
		res.redirect('/');
	}
	else {
		await pool.query(`INSERT INTO users (username, password) VALUES('${signupData.username}', '${signupData.password}')`);
		userSignup.status = true;
		userSignup.message = '';
		let userData = await pool.query(`SELECT * FROM users where username='${signupData.username}'`);
		currentUser = userData.rows[0];
		console.log(currentUser);
		userLogin.status = true;
		res.redirect('/');
	}
});

app.get('/logout', (req, res) => {
	userLogin.status = false;
	userLogin.message = '';
	userSignup.status = false;
	userSignup.message = '';
	currentUser = '';
	homePage = 'login';
	res.redirect('/');
})

app.post('/new_note', async (req, res) => {
	let data = req.body;
	data.title = data.title.replace(/'+/g, "''");
	data.body = data.note.replace(/'+/g, "''");
	console.log(data);
	console.log(currentUser);
	await pool.query(`INSERT INTO notes (title, note, userid) VALUES ('${data.title}', '${data.note}', '${currentUser.id}')`);
	res.sendFile('new_note.html', {root: __dirname});
});


app.get('/note/:id', async (req, res) => {
	let note_1 = await pool.query(`SELECT * FROM notes WHERE id = ${req.params.id}`);
	let note = note_1.rows[0];
	res.render('note', {note});
});

app.post('/edit_note/:id', async (req, res) => {
	let data = req.body;
	data.title = data.title.replace(/'+/g, "''");
	data.body = data.note.replace(/'+/g, "''");
	await pool.query(`UPDATE notes SET title = '${data.title}', note = '${data.note}' WHERE id = '${req.params.id}'`);
	res.redirect(`/note/${req.params.id}`);
});

// UPDATE notes SET title = why, note = fuck WHERE id = 1;
app.get('/delete_note/:id', async (req, res)=> {
	await pool.query(`DELETE FROM notes WHERE id = '${req.params.id}'`);
	res.redirect('/');
});


app.get('/delete_user', (req, res) => {
	res.render('delete_user', {del});
});

app.post('/confirm_delete', async (req, res) => {
	let {password} = req.body;
	if (password == currentUser.password) {
		await pool.query(`DELETE FROM users WHERE id = ${currentUser.id}`);
		await pool.query(`DELETE FROM notes WHERE userid = ${currentUser.id}`);
		currentUser = '';
		userLogin.status = false;
		userSignup.status = false;
		res.redirect('/');
	}
	else {
		del.message = 'Incorrect password';
		res.redirect('/delete_user');
	}
});

app.listen(8080, () => {
	console.log('Server listening on port 8080');
});

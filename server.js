const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory

const loginFilePath = path.join(__dirname, 'public', 'logins.txt');
const petsFilePath = path.join(__dirname, 'public', 'pets.txt');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Home.html'));
});

app.get('/CreateAccount.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CreateAccount.html'));
});

app.get('/Give', (req, res) => {
    const isLoggedIn = req.session.isLoggedIn || false;
    res.render('Give', { isLoggedIn, message: null });  // Ensure message is always passed
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading login file:', err);
            return res.status(500).send('Server error');
        }

        const users = data.split('\n').map(line => line.split(':'));
        const isAuthenticated = users.some(user => user[0] === username && user[1] === password);

        if (isAuthenticated) {
            req.session.isLoggedIn = true;
            req.session.username = username;
            console.log('User authenticated:', username);
            res.redirect('/Give');  // Redirect to /Give after successful login
        } else {
            console.log('Authentication failed for user:', username);
            res.render('Give', { isLoggedIn: false, message: 'Invalid username or password.' });
        }
    });
});

app.post('/create-account', (req, res) => {
    const { username, password } = req.body;
    const usernamePattern = /^[a-zA-Z0-9]+$/;
    const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{4,}$/;

    if (!usernamePattern.test(username) || !passwordPattern.test(password)) {
        return res.redirect('/CreateAccount.html?error=invalid');
    }

    fs.readFile(loginFilePath, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Server error');

        const users = data.split('\n').map(line => line.split(':')[0]);
        if (users.includes(username)) {
            return res.redirect('/CreateAccount.html?error=exists');
        }

        const userEntry = `${username}:${password}\n`;
        fs.appendFile(loginFilePath, userEntry, err => {
            if (err) return res.status(500).send('Server error');
            res.redirect('/CreateAccount.html?success=true');
        });
    });
});

app.post('/submit-pet', (req, res) => {
    if (req.session.isLoggedIn) {
        const { ani, breed, age, gen, oth, attractive, owner, email } = req.body;
        const username = req.session.username;
        const petId = Date.now(); // Use timestamp as unique ID for simplicity

        const petEntry = `${petId}:${username}:${ani}:${breed}:${age}:${gen}:${oth}:${attractive}:${owner}:${email}\n`;
        fs.appendFile(petsFilePath, petEntry, (err) => {
            if (err) {
                res.status(500).send('Server error');
            } else {
                res.redirect('/Give?message=Pet registered successfully.');
            }
        });
    } else {
        res.redirect('/Give');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        res.render('Give', { isLoggedIn: false, message: 'You have been logged out successfully.' });
    });
});

// Start the server
app.listen(4200, () => {
    console.log('Server running on http://localhost:4200');
});


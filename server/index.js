const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const flash = require('connect-flash');
const passport = require('passport');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const sessionStore = new SequelizeStore({ db });
const { User } = require('./db/models');
const app = express();

if (process.env.NODE_ENV !== 'production') require('../secrets');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  return User.findOne({ where: { id: id } })
    .then(user => {
      done(null, user);
      return null;
    })
    .catch(err => done(err));
});

// logging middleware
app.use(morgan('dev'));

// parse http responses
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());

// auth set up
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'this is a secret',
    store: sessionStore,
    saveUninitialized: false,
    resave: false
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', require('./auth'));

app.use('/api', require('./api'));

// serve static files
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// html
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public/index.html'))
);

// error handling
app.use((err, req, res, next) => {
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500).send(err.message || 'Internal server error.');
});

if (require.main === module) {
  db.sync().then(({ config }) => {
    console.log(`successfully connected to database: ${config.database}`);
    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
      console.log(`app listening on port: ${PORT}`);
    });
  });
}

module.exports = app;

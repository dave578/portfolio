const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const db = require('./db');
const router = require('./router');
const cors = require('cors');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/prova'));

app.use('/api', router);

const server = app.listen(3030, function() {
  console.log('Server in ascolto sulla porta 3030!');
});
module.exports = server;
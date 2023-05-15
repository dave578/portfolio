const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'APP'
});
connection.connect(function(err) {
  if (err) throw err;
  console.log('Connesso al database!');
});
module.exports = connection;
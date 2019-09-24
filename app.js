var express = require('express');
var path = require('path');
var app = express();

app.use('/', express.static(path.join(__dirname, 'public')));

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
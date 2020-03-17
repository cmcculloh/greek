const express = require('express');
const path = require('path');
const app = express();

const sassMiddleware = require('node-sass-middleware');


app.use('/',
	sassMiddleware({
		debug: true,
		sourceMap: true,
		outputStyle: 'expanded',
		src: path.join(__dirname, 'public')
	}),
	express.static(path.join(__dirname, 'public')));

let port = process.env.PORT;
if (port == null || port == "") {
	port = 3000;
}
app.listen(port);
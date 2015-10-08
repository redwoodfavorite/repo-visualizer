var express = require('express');
var request = require('request');

var app = express();

var origin = ''

var OAuthOptions = {
	clientID: 'd5e7b2cd65c08a57289d',
	clientSecret: 'cd55af314bce595f533c4801c7dab0aed2e89320'
};

app.use(express.static('public'));

app.get('/authorize', (req, res) => {
	var code = req.query.code;

	request('https://www.github.com/login/oauth/access_token?' 
		+ 'code=' + code + '&'
		+ 'client_id=' + OAuthOptions.clientID + '&'
		+ 'client_secret=' + OAuthOptions.clientSecret,
		function (error, response, body) {
			if (error) {
				console.log('ERR', error);
			}
			else {
				var regex = new RegExp("access_token=([^&#]*)"),
        			results = regex.exec(body);

				res.cookie('oauthToken', results[1]);
			}

			res.sendFile('/index.html', { root: 'public' });
		}
	);


});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
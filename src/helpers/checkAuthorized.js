export default function checkAuthorized(authToken) {
	return new Promise((res, rej) => {
		let request = new XMLHttpRequest();
			request.onload = handleLoaded.bind(null, res);
			request.open('GET', `https://api.github.com/applications/d5e7b2cd65c08a57289d/tokens/${authToken}`);
			request.send();
	});
}

function handleLoaded(res, event) {
	var response = JSON.parse(event.target.response)
}
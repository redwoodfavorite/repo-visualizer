import getCookie from './helpers/getCookie';
import getRepoData from './helpers/getRepoData';
import d3Extensions from './helpers/d3Extensions';
import getAveragePixelColor from './helpers/getAveragePixelColor';

import Visualizer from './visualizer/TreeGraphVisualizer';

let authToken = getCookie('oauthToken');

window.addEventListener('load', () => {
	let	form = document.querySelector('form'),
		input = document.getElementById('repo-url'),
		login = document.getElementById('logins');

	if (authToken) login.style.display = 'none';

	form.addEventListener('submit', event => {
		event.preventDefault();

		if (!input.value) return;

		getRepoData(input.value, authToken)
			.then(repo => {
				return getAveragePixelColor(repo[1].avatar_url)
					.then(color => {
						new Visualizer({
							selector: 'body',
							tree: repo[0],
							user: repo[1],
							color: color
						});
					});
			})

		input.value = '';
		form.style.display = 'none';
	});
});

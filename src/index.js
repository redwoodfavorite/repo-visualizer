import d3Extensions from './helpers/d3Extensions';
import Visualizer from './visualizer/TreeGraphVisualizer';
import getRepoData from './visualizer/getRepoData';
import getAveragePixelColor from './helpers/getAveragePixelColor';
import getCookie from './helpers/getCookie';

let authToken = getCookie('oauthToken');

window.addEventListener('load', () => {
	let	form = document.querySelector('form'),
		input = document.getElementById('repo-url'),
		login = document.getElementById('login');

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

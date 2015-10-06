import d3Extensions from './helpers/d3Extensions';
import Visualizer from './visualizer/Visualizer';
import getRepoData from './visualizer/getRepoData';

let form, input;

window.addEventListener('load', () => {
	form = document.querySelector('form'),
	input = document.getElementById('repo-url');

	form.addEventListener('submit', event => {
		event.preventDefault();

		if (!input.value) return;

		getRepoData(input.value)
			.then(repo => {
				new Visualizer({
					selector: 'body',
					tree: repo[0],
					user: repo[1]
				});
			});

		input.value = '';
		form.style.display = 'none';
	});
});

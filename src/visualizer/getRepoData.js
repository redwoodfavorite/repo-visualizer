export default function getRepoData(githubURL, authToken) {

	const TYPE_BLOB = "blob";
	const TYPE_TREE = "tree";

	let paths = githubURL.split('/'),
		repo  = paths[paths.length - 1],
		owner = paths[paths.length - 2];

	return Promise.all([
		new Promise((res, rej) => {

			let request = new XMLHttpRequest();
				request.addEventListener('load', data => {
					let tree = buildTree(
						JSON.parse(data.target.response)
					);
					res(tree);
				});

				request.open("GET", `http://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1&access_token=${authToken}`);
				request.send();
		}),
		new Promise((res, rej) => {

			let request = new XMLHttpRequest();
				request.addEventListener('load', data => {
					let user = JSON.parse(data.target.response);

					res(user);
				});

				request.open("GET", `http://api.github.com/users/${owner}`);
				request.send();
		})
	]);

	function buildTree(responseJSON) {
		if (responseJSON.truncated)
			console.warn('API response is truncated!');

		let pathsToTrees = {
			'/': {
				name: 'root',
				blobs: [],
				subDir: [],
				totalSize: 0,
				size: {}
			}
		};

		let items = responseJSON.tree,
			name, split, tree, parent,
			directory, extension;

		items.forEach(item => {
			switch (item.type) {

				case TYPE_BLOB:
					split = item.path.split('/'),
					name = split.pop(),
					directory = split.join('/') || '/',
					extension = name.split('.').pop();

					parent = pathsToTrees[directory];
					parent.blobs.push({
						name: name,
						totalSize: item.size,
						ext: extension
					});
					break;

				case TYPE_TREE:
					split = item.path.split('/'),
					name = split.pop(),
					parent = split.join('/') || '/';
					tree = {
						name: item.path,
						totalSize: 0,
						size: {},
						blobs: [],
						subDir: []
					};
					parent = pathsToTrees[parent];
					parent.subDir.push(tree);
					pathsToTrees[item.path] = tree;
					break;

				default:
					console.error('Bad type!');
					break;
			}
		});

		sumDirSize(pathsToTrees['/']);

		return pathsToTrees['/'];
	}
}

function sumDirSize(dir) {
	dir.blobs.forEach(blob => {
		dir.totalSize += blob.totalSize;
		dir.size[blob.ext] = dir.size[blob.ext] || 0;
		dir.size[blob.ext] += blob.totalSize;
	});

	dir.subDir.forEach(sub => {
		dir.totalSize += sumDirSize(sub)
		for (let ext in sub.size) {
			dir.size[ext] = dir.size[ext] || 0;
			dir.size[ext] += sub.size[ext];
		}
	});

	return dir.totalSize;
}
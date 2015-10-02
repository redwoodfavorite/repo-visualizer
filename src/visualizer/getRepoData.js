export default function getRepoData(githubURL) {

	const TYPE_BLOB = "blob";
	const TYPE_TREE = "tree";

	return new Promise((res, rej) => {

		let paths = githubURL.split('/'),
			repo = paths[paths.length - 1],
			owner = paths[paths.length - 2];

		let request = new XMLHttpRequest();
			request.addEventListener('load', data => {
				let tree = buildTree(
					JSON.parse(data.target.response)
				);
				res(tree);
			});

			request.open("GET", `http://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`);
			request.send();
	});

	function buildTree(responseJSON) {
		if (responseJSON.truncated)
			console.warn('API response is truncated!');

		let pathsToTrees = {
			'/': {
				path: '/',
				blobs: [],
				subDir: [],
				size: 0
			}
		};

		let items = responseJSON.tree,
			name, split, tree, parent,
			directory;

		items.forEach(item => {
			switch (item.type) {

				case TYPE_BLOB:
					split = item.path.split('/'),
					name = split.pop(),
					directory = split.join('/') || '/';

					parent = pathsToTrees[directory];
					parent.blobs.push({
						name: name,
						size: item.size
					});
					break;

				case TYPE_TREE:
					split = item.path.split('/'),
					name = split.pop(),
					parent = split.join('/') || '/';
					tree = {
						name: item.path,
						size: 0,
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
	dir.blobs.forEach(blob => dir.size += blob.size);
	dir.subDir.forEach(sub => dir.size += sumDirSize(sub));

	return dir.size;
}
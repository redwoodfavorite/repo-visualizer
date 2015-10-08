export default function getAveragePixelColor(image) {
	return ensureImageLoaded(image)
		.then(getAverageColor)
		.then(toHexColor);
}

function ensureImageLoaded (input) {
	return new Promise((res, rej) => {
		let image;

		if (typeof input === 'string') {
			image = new Image();
			image.crossOrigin = 'anonymous';
			image.onload = res.bind(null, image);
			image.src = input;
		}

		else if (!input.complete) {
			image.onload = res.bind(null, image);
		}

		else {
			res(input);
		}
	})
}

function getAverageColor(image) {
	let canvas = document.createElement('canvas'),
		width = canvas.height = image.naturalHeight || image.offsetHeight || image.height,
		height = canvas.width = image.naturalWidth || image.offsetWidth || image.width,
		context = canvas.getContext('2d');

	context.drawImage(image, 0, 0);
	
	let data = context.getImageData(
			0, 0,
			width,
			height
		).data,
		length = data.length,
		numPixels = data.length / 4,
		rgb = [0, 0, 0],
		i = -1, j;

	while (i++ < numPixels - 1) {
		j = i * 4;

		rgb[0] += data[j];
		rgb[1] += data[j + 1];
		rgb[2] += data[j + 2];
	}

	rgb[0] = Math.floor(rgb[0] / numPixels);
	rgb[1] = Math.floor(rgb[1] / numPixels);
	rgb[2] = Math.floor(rgb[2] / numPixels);

	return rgb;
}

function componentToHex(c) {
    let hex = c.toString(16);

    return hex.length === 1 ? "0" + hex : hex;
}

function toHexColor(rgb) {
    return `#${componentToHex(rgb[0])}${componentToHex(rgb[1])}${componentToHex(rgb[2])}`;
}
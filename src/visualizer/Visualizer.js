import d3 from 'd3';
import { GUI } from 'dat-gui';
import COLORS from '../data/EXT_COLORS';
import _ from 'lodash';
import please from 'pleasejs';

export default class Visualizer {

	constructor(options) {
		this.selector = options.selector;
		this.element = document.querySelector(this.selector);
		this.repo = {
			tree: options.tree,
			user: options.user
		};
		this.width = this.element.offsetWidth;
		this.height = this.element.offsetHeight;
		this.parameters = null;
		this.rootPos = [
			this.width * 0.5,
			this.height * 0.5
		];

		/*
		 * Add configuration
		 */

		this.initGUI();

		/*
		 * Find file size range for sizing controls
		 */

		this.minFileSize = Infinity;
		this.maxFileSize = 0;
		this.fileSizeRange = 0;

		this.findFileSizeRange(this.repo.tree);
		this.fileSizeRange = this.maxFileSize - this.minFileSize;

		/*
		 * Get node and link data from repo json
		 */

		// var nColors = Object.keys(this.repo.tree.size);
		// var colors = please.make_color({
		// 	colors_returned: nColors
		// });

		// var i = 0;
		// for (var ext in this.repo.tree.size) {
		// 	COLORS[ext] = colors[i++];
		// }

		this._nodeData = [];
		this._linkData = [];

		_getNodesAndLinks(
			this._nodeData,
			this._linkData,
			this.repo.tree
		);

		this._linkData.reverse();

		this._nodeData[0].fixed = true;
		this._nodeData[0].x = this.rootPos[0];
		this._nodeData[0].y = this.rootPos[1];

		this.nodeData = this._nodeData.slice();
		this.linkData = this._linkData.slice();

		/*
		 * Initialize layout
		 */

		this.layout = d3.layout.force()
		    .size([
		    	this.width,
		    	this.height
		    ])
		    .nodes(this.nodeData)
		    .links(this.linkData);

		this.setLayoutParameters();
		this.layout.on('tick', this.onTick.bind(this))
		this.layout.start();

		/*
		 * Create SVG canvas
		 */

		this.svg = d3
			.select(this.selector)
			.append('svg')
		    .attr('width', this.width)
		    .attr('height', this.height);
		
		this.initDefines({
			profileImg: this.repo.user.avatar_url
		});

		/*
		 * Draw links nodes and text
		 */

		this.handleDataChange(
			this.nodeData,
			this.linkData
		);
	}

	onTick() {
		let _this = this;

		this.node
  			.attr('transform', d => {
  				let scale;

  				if (d.type === 'TREE')
 					scale = 0;
 				else
  					scale = this.interpolateFileSize(
					d.totalSize,
					this.parameters.minNodeSize,
					this.parameters.maxNodeSize
				);

  				return `translate(${d.x}, ${d.y}) scale(${scale}, ${scale})`
  			})

  		this.text
			.attr("x", d => d.x + 35 * this.interpolateFileSize(
					d.totalSize,
					this.parameters.minNodeSize,
					this.parameters.maxNodeSize
				)
			)
  			.attr("y", d => d.y)

	    this.link
	    	.style('stroke-width', d => {
	    		return this.interpolateFileSize(
	    			d.target.totalSize,
	    			this.parameters.minLinkWidth,
	    			this.parameters.maxLinkWidth
	    		);
	    	})
	    	.attr('x1', d => { return d.source.x; })
	        .attr('y1', d => { return d.source.y; })
	        .attr('x2', d => { return d.target.x; })
	        .attr('y2', d => { return d.target.y; });
	}

	filterByFileSize(minFileSize) {
		let pass = { };

		this.nodeData = this._nodeData
			.filter(d => d.totalSize >= minFileSize
				? (pass[d.id] = true)
				: false
			);

		this.linkData = this._linkData
			.filter(d => pass[d.target.id]);

		this.handleDataChange(
			this.nodeData,
			this.linkData
		);

		this.layout.nodes(this.nodeData);
		this.layout.links(this.linkData);
		this.layout.start();
	}

	handleDataChange(nodeData, linkData) {
		this.link = this.svg
			.selectAll('.link')
		    .data(linkData, d => `${d.target.id}-${d.source.id}`)

		this.link
			.enter()
		    .append('line')
		    .attr('stroke-linecap', 'butt')
		    .attr('class', 'link')
			.style('stroke', d => {
				let m = [0, 0, 0], ext, scale,
					extColor, out = d3.rgb();

				if (d.target.type === 'BLOB') {
					return COLORS[d.target.ext];
				}

				for (ext in d.target.size) {
					scale = d.target.size[ext] / d.target.totalSize;
					extColor = d3.rgb(COLORS[ext]) || [0, 0, 0];

					out.r += extColor.r * scale;
					out.g += extColor.g * scale;
					out.b += extColor.b * scale;
				}

				return d3.rgb(out);
			})

		this.link
			.exit()
		    .remove();

		this.node = this.svg
			.selectAll('.node')
		    .data(nodeData, d => d.id);

		this.node
		    .enter()
		    .append('polygon')
		    .attr('points', '30,2 15,28 -15,28 -30,2 -15,-28 15,-28')
		    .attr('class', 'node')
  			.style('fill', d => COLORS[d.ext])
			.call(this.layout.drag);

		this.node
		    .exit()
		    .remove();

  		this.profileImg = this.svg
  			.append('rect')
  			.attr('width', 50)
  			.attr('height', 50)
  			.attr('x', this.rootPos[0] - 25)
  			.attr('y', this.rootPos[1] - 25)
  			.attr('rx', 10)
  			.attr('ry', 10)
  			.style('fill', 'url(#repo-profile)');

		this.text = this.svg
			.selectAll('text')
		    .data(nodeData, d => d.id);

		this.text
		    .enter()
		    .append('text')
	        .text(d => d.name)
			.style('font-size', d => this.interpolateFileSize(
        		d.totalSize,
        		5, 16
        	));

		this.text
		    .exit()
		    .remove();

		this.dirText = this.text
			.filter(d => d.type === 'TREE')
			.style('visibility', 'hidden')
	}

	interpolateFileSize(size, min, max) {
		return min
	    + ( (size - min) / this.fileSizeRange )
		* ( max - min );
	}

	initGUI() {
		this.parameters = {
			toggleLabels: false,
			minLinkWidth: 1,
			maxLinkWidth: 10,
			maxNodeSize: 1.3,
			minNodeSize: 0.3,
			nodeCharge: -1000,
			linkStrength: 0.9,
			minFontSize: 5,
			maxFontSize: 18,
			gravity: 0.1,
			minFileSize: 0
		};

		this.GUI = new GUI();

		this.toggleLabels = this.GUI.add(this.parameters, 'toggleLabels');
		this.chargeController = this.GUI.add(this.parameters, 'nodeCharge', -2000, -200);
		this.linkStrengthController = this.GUI.add(this.parameters, 'linkStrength', 0.3, 5.0);
		this.maxNodeSizeController = this.GUI.add(this.parameters, 'maxNodeSize', 0.6, 1.5);
		this.minNodeSizeController = this.GUI.add(this.parameters, 'minNodeSize', 0.1, 0.6);
		this.minLinkWidthController = this.GUI.add(this.parameters, 'minLinkWidth', 0.5, 5);
		this.maxLinkWidthController = this.GUI.add(this.parameters, 'maxLinkWidth', 5, 100);
		this.gravityController = this.GUI.add(this.parameters, 'gravity', -1, 2);
		this.minFileSizeController = this.GUI.add(this.parameters, 'minFileSize', 0, 10000);

		this.toggleLabels.onChange(value => {
			this.text.style('display', value ? 'none' : '');
		});

		this.minFileSizeController.onChange(_.debounce(this.filterByFileSize.bind(this), 60));
		this.chargeController.onChange(this.setLayoutParameters.bind(this));
		this.linkStrengthController.onChange(this.setLayoutParameters.bind(this));
		this.gravityController.onChange(this.setLayoutParameters.bind(this));
		this.minNodeSizeController.onChange(this.onTick.bind(this));
		this.maxNodeSizeController.onChange(this.onTick.bind(this));
		this.minLinkWidthController.onChange(this.onTick.bind(this));
		this.maxLinkWidthController.onChange(this.onTick.bind(this));
	}

	initDefines(options) {
		// this.gradient = this.svg.append("svg:defs")
		//   	.append("svg:linearGradient")
		//     .attr("id", "gradient")
		//     .attr("x1", "0%")
		//     .attr("y1", "0%")
		//     .attr("x2", "100%")
		//     .attr("y2", "100%")
		//     .attr("spreadMethod", "pad");

		// this.gradient.append("svg:stop")
		//     .attr("offset", "0%")
		//     .attr("stop-color", "#0c0")
		//     .attr("stop-opacity", 1);

		// this.gradient.append("svg:stop")
		//     .attr("offset", "100%")
		//     .attr("stop-color", "#c00")
		//     .attr("stop-opacity", 1);

		let defs = this.svg
			.append('defs');

		defs
			.append('pattern')
			    .attr('id', 'repo-profile')
			    .attr('width', 50)
			    .attr('height', 50)
			.append('image')
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', 50)
				.attr('height', 50)
				.attr('xlink:href', options.profileImg)
	}

	setLayoutParameters() {
		this.layout
			.charge(this.parameters.nodeCharge)
			.linkStrength(this.parameters.linkStrength)
			.gravity(this.parameters.gravity)
	}

	findFileSizeRange(dir) {
		dir.blobs.forEach(blob => {
			if (blob.totalSize > this.maxFileSize)
				this.maxFileSize = blob.totalSize;

			else if (blob.totalSize < this.minFileSize)
				this.minFileSize = blob.totalSize;
		});

		dir.subDir.forEach(this.findFileSizeRange.bind(this))
	}
}

function _getNodesAndLinks(nodes, links, tree, i) {
	let index = 0,
		child = tree.subDir[0],
		parentId,
		id = parentId = i || 0;

	nodes.push({
		type: 'TREE',
		name: tree.name,
		totalSize: tree.totalSize,
		size: tree.size,
		id: id++
	});

	tree.blobs.forEach(blob => {
		links.push({
			target: id,
			source: parentId
		});

		nodes.push({
			type: 'BLOB',
			totalSize: blob.totalSize,
			name: blob.name,
			id: id++,
			ext: blob.ext
		});
	});

	while (child) {
		links.push({
			target: id,
			source: parentId
		});

		id = _getNodesAndLinks(nodes, links, child, id);

		child = tree.subDir[++index];
	}

	return id;
}
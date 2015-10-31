import d3 from 'd3';
import { GUI } from 'dat-gui';
import COLORS from '../data/EXT_COLORS';
import _ from 'lodash';
import please from 'pleasejs';
import GHColors from 'github-colors';
import d3Tip from 'd3-tip';

const TYPES = {
	files: 'BLOB',
	folders: 'TREE'
}

export default class TreeGraph {

	constructor(options) {
		this.selector = options.selector;
		this.element = document.querySelector(this.selector);
		this.baseColor = options.color;
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
		this.minDirSize = Infinity;
		this.maxDirSize = 0;
		this.fileSizeRange = 0;

		this.findFileSizeRange(this.repo.tree);
		this.fileSizeRange = this.maxFileSize - this.minFileSize;
		this.dirSizeRange = this.maxDirSize - this.minDirSize;

		/*
		 * Get node and link data from repo json
		 */

		this.generateColorScheme(this.baseColor);

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
		 this.initTooltip();

		this.svg = d3
			.select(this.selector)
			.append('svg')
		    .attr('width', this.width)
		    .attr('height', this.height);

		this.svg
			.call(this.tooltip)

		this.initDefines({
			profileImg: this.repo.user.avatar_url
		});

		/*
		 * Draw links nodes and text
		 */

		this.handleDataChange();
		this.addProfileImage();
	}

	onTick() {
		let _this = this;

		this.node
  			.attr('transform', d => {
  				let scale = this.interpolateFileSize(
						d.totalSize,
						this.parameters.minNodeSize,
						this.parameters.maxNodeSize,
						d.type === 'TREE'
					);

  				return `translate(${d.x}, ${d.y}) scale(${scale}, ${scale})`
  			});

		let scale = this.interpolateFileSize(
			this.nodeData[0].totalSize,
			this.parameters.minNodeSize,
			this.parameters.maxNodeSize,
			true
		);

  		this.profileImg
  			.attr('transform',
  				`translate(
  					${this.nodeData[0].x},
  					${this.nodeData[0].y})
  					scale(${scale * 0.8}, ${scale * 0.8}
  				)`
  			);

	    this.link
	    	.style('stroke-width', d =>
	    		this.interpolateFileSize(
	    			d.target.totalSize,
	    			this.parameters.minLinkWidth,
	    			this.parameters.maxLinkWidth,
	    			d.target.type === 'TREE'
	    		)
	    	)
	    	.attr('x1', d => d.source.x)
	        .attr('y1', d => d.source.y)
	        .attr('x2', d => d.target.x)
	        .attr('y2', d => d.target.y);
	}

	generateColorScheme(baseColor) {


		// let nColors = Object.keys(this.repo.tree.size).length,
		// 	colors = please.make_color({
		// 		colors_returned: nColors,
		// 		base_color: baseColor
		// 	}),
		// 	i = 0,
		// 	ext;

		for (let ext in this.repo.tree.size) {
			// COLORS[ext] = colors[i++];
			// console.log( GHColors.ext(ext))
			COLORS[ext] = GHColors.ext(ext).color;
		}
	}

	initTooltip() {
		this.tooltip = d3Tip()
		  .attr('class', 'd3-tip')
		  .offset([-10, 0])
		  .html(d => `
				<strong>${d.type === 'TREE' ? 'folder' : 'file'}:</strong>
				<span style='color:red'>${d.name}</span>`
		  );
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

		this.handleDataChange();

		this.layout.nodes(this.nodeData);
		this.layout.links(this.linkData);
		this.layout.start();
	}

	addProfileImage() {
		this.profileImg = this.svg
  			.append('polygon')
  			.style('pointer-events', 'none')
		    .attr('points', '30,2 15,28 -15,28 -30,2 -15,-28 15,-28')
  			.style('fill', 'url(#repo-profile)');
	}

	handleDataChange() {
		this.link = this.svg
			.selectAll('.link')
		    .data(this.linkData, d => `${d.target.id}-${d.source.id}`)

 		this.link
			.enter()
		    .append('line')
		    .attr('class', 'link')
		    .attr('stroke-linecap', 'butt')

		this.link
		    .style('visibility', 'visible')
				.style('stroke', d => {
					if (d.target.type === 'BLOB') {
						return COLORS[d.target.ext];
					}
					else {
						return this.getInterpolatedColor(
							d.target.size,
							d.target.totalSize
						);
					}
				});

		this.link.filter(d => d.target.type === 'BLOB'
			 && TYPES[this.parameters.show] === 'TREE')
				 .style('visibility', 'hidden');

		this.link
			.exit()
		    .remove();

		this.node = this.svg
			.selectAll('.node')
		    .data(this.nodeData, d => d.id)

		this.node
		    .enter()
		    .append('polygon')
		    .attr('points', '30,2 15,28 -15,28 -30,2 -15,-28 15,-28')
		    .attr('class', 'node')
			.call(this.layout.drag)

		this.node
				.on('mouseover', this.tooltip.show)
				.on('mouseout', this.tooltip.hide)

		this.node
		    .style('visibility', 'visible')
  			.style('fill', d => {
  				return d.type === 'BLOB'
	  				? COLORS[d.ext]
	  				: this.getInterpolatedColor(d.size, d.totalSize)
	  			}
  			);

		this.node
  			.filter(d => d.type !== TYPES[this.parameters.show] && d.id !== 0)
				.style('visibility', 'hidden');

		this.node
		    .exit()
		    .remove();

	}

	interpolateFileSize(size, min, max, isTree) {
		let range = isTree ? this.dirSizeRange : this.fileSizeRange;

		return min
	    + (( (size - min) / range )
	    		* ( max - min ));
	}

	getInterpolatedColor(extensions, total) {
		let m = [0, 0, 0], ext, scale,
			extColor, out = d3.rgb();

		for (ext in extensions) {
			scale = extensions[ext] / total;
			extColor = d3.rgb(COLORS[ext]);

			out.r += extColor.r * scale;
			out.g += extColor.g * scale;
			out.b += extColor.b * scale;
		}

		return out.hsl().toString();
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
			minFileSize: 0,
			show: 'files',
			color: 'byProfile'
		};

		this.GUI = new GUI();

		this.colorController = this.GUI.add(this.parameters, 'color', ['byProfile', 'random']);
		this.showController = this.GUI.add(this.parameters, 'show', ['files', 'folders']);
		this.toggleLabels = this.GUI.add(this.parameters, 'toggleLabels');
		this.chargeController = this.GUI.add(this.parameters, 'nodeCharge', -2000, -200);
		this.linkStrengthController = this.GUI.add(this.parameters, 'linkStrength', 0.3, 5.0);
		this.maxNodeSizeController = this.GUI.add(this.parameters, 'maxNodeSize', 0.4, 1.5);
		this.minNodeSizeController = this.GUI.add(this.parameters, 'minNodeSize', 0.1, 0.4);
		this.minLinkWidthController = this.GUI.add(this.parameters, 'minLinkWidth', 0.5, 5);
		this.maxLinkWidthController = this.GUI.add(this.parameters, 'maxLinkWidth', 5, 100);
		this.gravityController = this.GUI.add(this.parameters, 'gravity', -1, 2);
		this.minFileSizeController = this.GUI.add(this.parameters, 'minFileSize', 0, 10000);

		this.colorController.onChange(this.handleColorChange.bind(this));
		this.showController.onChange(this.handleDataChange.bind(this));
		this.minFileSizeController.onChange(_.debounce(this.filterByFileSize.bind(this), 60));
		this.chargeController.onChange(this.setLayoutParameters.bind(this));
		this.linkStrengthController.onChange(this.setLayoutParameters.bind(this));
		this.gravityController.onChange(this.setLayoutParameters.bind(this));
		this.minNodeSizeController.onChange(this.onTick.bind(this));
		this.maxNodeSizeController.onChange(this.onTick.bind(this));
		this.minLinkWidthController.onChange(this.onTick.bind(this));
		this.maxLinkWidthController.onChange(this.onTick.bind(this));
	}

	handleColorChange(value) {
		this.generateColorScheme(
			value === 'byProfile'
			? this.baseColor
			: undefined
		);
		this.handleDataChange();
	}

	initDefines(options) {
		let defs = this.svg
			.append('defs');

		defs
			.append('pattern')
			    .attr('id', 'repo-profile')
			    .attr('width', 60)
			    .attr('height', 60)
			.append('image')
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', 60)
				.attr('height', 60)
				.attr('xlink:href', options.profileImg)
	}

	setLayoutParameters() {
		this.layout
			.charge(this.parameters.nodeCharge)
			.linkStrength(this.parameters.linkStrength)
			.gravity(this.parameters.gravity)
	}

	findFileSizeRange(dir) {
			if (dir.totalSize > this.maxDirSize)
				this.maxDirSize = dir.totalSize;

			else if (dir.totalSize < this.minDirSize)
				this.minDirSize = dir.totalSize;

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

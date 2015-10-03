import d3 from 'd3';
import { GUI } from 'dat-gui';
import COLORS from './FILE_COLORS';

export default class Visualizer {

	constructor(options) {
		this.selector = options.selector;
		this.element = document.querySelector(this.selector);
		this.repo = options.repo;
		this.width = this.element.offsetWidth;
		this.height = this.element.offsetHeight;
		this.parameters = null;

		this.svg = d3
			.select(this.selector)
			.append('svg')
		    .attr('width', this.width)
		    .attr('height', this.height);

		this.nodes = [];
		this.links = [];

		this.gui = null;
		this.initGUI();
		this.initGradient();

		this.minFileSize = Infinity;
		this.maxFileSize = 0;
		this.fileSizeRange = 0;

		this.findFileSizeRange(this.repo);
		this.fileSizeRange = this.maxFileSize - this.minFileSize;

		_getNodesAndLinks(
			this.nodes,
			this.links,
			this.repo
		);

		// z-index
		this.links.reverse();

		this.nodes[0].fixed = true;
		this.nodes[0].x = this.width * 0.5;
		this.nodes[0].y = this.height * 0.5;

		this.link = this.svg.selectAll('.link')
		    .data(this.links)
		    .enter()
		    .append('line')
		    .attr('stroke-linecap', 'round')
		    .attr('class', 'link')

		this.node = this.svg.selectAll('.node')
		    .data(this.nodes)
		    .enter()
		    .append('circle')
		    .attr('class', 'node')
  			.style('fill', d => COLORS[d.ext]);

		this.text = this.svg.selectAll('text .label')
			.data(this.nodes)
			.enter()
			.append('text')
	        .attr('text-anchor', 'left')
	        .text(d => d.name);

		this.layout = d3.layout.force()
		    .size([
		    	this.width,
		    	this.height
		    ])
		    .nodes(this.nodes)
		    .links(this.links);

		this.setLayoutParameters();

		this.layout.on('tick', this.tick.bind(this))
		this.layout.start();

		this.link.style('stroke', d => {
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
		});

		this.node.on('mouseover', this.handleMouseOver);
	}

	tick() {
		let _this = this;

		this.node
			.attr("cx", d => { return d.x; })
  			.attr("cy", d => { return d.y; })
  			.attr('r', d => {
  				// console.log( d.totalSize - _this.minFileSize / _this.fileSizeRange )
  				console.log( _this.file)
				if (d.type === 'BLOB')

					return (
						_this.parameters.minNodeSize + ( (d.totalSize - _this.minFileSize) / _this.fileSizeRange )
								    			* ( _this.parameters.maxNodeSize - _this.parameters.minNodeSize )
		    			);
				
				else return 0;
			});

  		this.text
			.attr("x", d => { return d.x + d.totalSize * 0.02; })
  			.attr("y", d => { return d.y; })

	    this.link
	    	.style('stroke-width', d => {
	    		return _this.parameters.minLinkWidth
	    			 + ( (d.target.totalSize - _this.minFileSize) / _this.fileSizeRange )
	    			 	    			 * ( _this.parameters.maxLinkWidth - _this.parameters.minLinkWidth );
	    	})
	    	.attr('x1', d => { return d.source.x; })
	        .attr('y1', d => { return d.source.y; })
	        .attr('x2', d => { return d.target.x; })
	        .attr('y2', d => { return d.target.y; });
	}

	initGUI() {
		this.parameters = {
			toggleLabels: false,
			minLinkWidth: 0.5,
			maxLinkWidth: 60,
			maxNodeSize: 30,
			minNodeSize: 10,
			nodeCharge: -1000,
			linkStrength: 0.9
		};

		this.GUI = new GUI();

		this.toggleLabels = this.GUI.add(this.parameters, 'toggleLabels');
		this.chargeController = this.GUI.add(this.parameters, 'nodeCharge', -2000, -200);
		this.linkStrengthController = this.GUI.add(this.parameters, 'linkStrength', 0.3, 5.0);
		this.maxNodeSizeController = this.GUI.add(this.parameters, 'maxNodeSize', 20, 100);
		this.minNodeSizeController = this.GUI.add(this.parameters, 'minNodeSize', 0, 20);
		this.minLinkWidthController = this.GUI.add(this.parameters, 'minLinkWidth', 1, 10);
		this.maxLinkWidthController = this.GUI.add(this.parameters, 'maxLinkWidth', 10, 100);

		this.toggleLabels.onChange(value => {
			this.text.style('display', value ? 'none' : '');
		});


		this.chargeController.onChange(this.setLayoutParameters.bind(this));
		this.linkStrengthController.onChange(this.setLayoutParameters.bind(this));
		this.minNodeSizeController.onChange(this.tick.bind(this));
		this.maxNodeSizeController.onChange(this.tick.bind(this));
		this.minLinkWidthController.onChange(this.tick.bind(this));
		this.maxLinkWidthController.onChange(this.tick.bind(this));
	}

	initGradient() {
		this.gradient = this.svg.append("svg:defs")
		  	.append("svg:linearGradient")
		    .attr("id", "gradient")
		    .attr("x1", "0%")
		    .attr("y1", "0%")
		    .attr("x2", "100%")
		    .attr("y2", "100%")
		    .attr("spreadMethod", "pad");

		this.gradient.append("svg:stop")
		    .attr("offset", "0%")
		    .attr("stop-color", "#0c0")
		    .attr("stop-opacity", 1);

		this.gradient.append("svg:stop")
		    .attr("offset", "100%")
		    .attr("stop-color", "#c00")
		    .attr("stop-opacity", 1);
	}

	handleMouseOver() {
		d3
		.select(this)
		.style({
			opacity: '1.0'
		});
	}

	handleMouseLeave() {
		d3
		.select(this)
		.style({
			opacity: '0.0'
		});
	}

	setLayoutParameters() {
		this.layout
			.charge(this.parameters.nodeCharge)
			.linkStrength(this.parameters.linkStrength)
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
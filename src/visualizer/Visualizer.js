import d3 from 'd3';

export default class Visualizer {

	constructor(options) {
		this.selector = options.selector;
		this.element = document.querySelector(this.selector);
		this.repo = options.repo;
		this.width = this.element.offsetWidth;
		this.height = this.element.offsetHeight;

		this.SCALE = 1 / (this.repo.size / 2000);
		this.MINSIZE = this.width * 0.01 * this.SCALE;

		this.svg = d3
			.select(this.selector)
			.append('svg')
		    .attr('width', this.width)
		    .attr('height', this.height);

		this.nodes = [];
		this.links = [];

		_getNodesAndLinks(
			this.nodes,
			this.links,
			this.repo
		);
		this.nodes[0].fixed = true;
		this.nodes[0].x = this.width * 0.5;
		this.nodes[0].y = this.height * 0.5;

		this.link = this.svg.selectAll('.link')
		    .data(this.links)
		    .enter()
		    .append('line')
		    .attr('class', 'link');

		this.node = this.svg.selectAll('.node')
		    .data(this.nodes)
		    .enter()
		    .append('circle')
		    .attr('class', 'node')

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
		    .charge(d => d.id ? -1000 : -5000)
		    .links(this.links);

		this.layout.linkStrength(0.9);
		this.layout.on('tick', this.tick.bind(this))
		this.layout.start();

		this.node.on('mouseover', this.handleMouseOver);
	}

	tick() {
		let _this = this;

		this.node
			.attr("cx", d => { return d.x; })
  			.attr("cy", d => { return d.y; })
  			.attr('r', d => {
				return d.type === 'BLOB'
					? _this.MINSIZE + d.size * 0.02 * _this.SCALE
					: 0
				});

  		this.text
			.attr("x", d => { return d.x; })
  			.attr("y", d => { return d.y; })

	    this.link
	    	.style('stroke-width', d => { return d.target.size / 100 * this.SCALE; })
	    	.attr('x1', d => { return d.source.x; })
	        .attr('y1', d => { return d.source.y; })
	        .attr('x2', d => { return d.target.x; })
	        .attr('y2', d => { return d.target.y; });
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
}

function _getNodesAndLinks(nodes, links, tree, i) {
	let index = 0,
		child = tree.subDir[0],
		parentId,
		id = parentId = i || 0;

	nodes.push({
		type: 'TREE',
		name: tree.name,
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
			size: blob.size,
			name: blob.name,
			id: id++
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
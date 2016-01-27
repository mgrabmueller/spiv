var canvas;
var ctx;
var grid;

var WEST = 0x1;
var EAST = 0x2;
var NORTH = 0x4;
var SOUTH = 0x8;

var Grid = function(rows, columns) {
    var r, c;
    this.grid = [];
    this.rows = rows;
    this.columns = columns;
    for (r = 0; r < rows; r++) {
	this.grid[r] = [];
	for (c = 0; c < columns; c++) {
	    this.grid[r][c] = WEST | EAST | NORTH | SOUTH;
	}
    }
}

Grid.prototype.eachCell = function(f) {
    var r, c;
    for (r = 0; r < this.rows; r++) {
	var row = this.grid[r];
	for (c = 0; c < this.columns; c++) {
	    var cell = row[c];
	    f(r, c, cell);
	}
    }
}

Grid.prototype.link = function(row, column, direction) {
    var dirx = 0,
	diry = 0,
	negdirection = 0;
    if (direction == WEST) {
	dirx = -1;
	diry = 0;
	negdirection = EAST;
    } else if (direction == EAST) {
	dirx = 1;
	diry = 0;
	negdirection = WEST;
    } else if (direction == NORTH) {
	dirx = 0;
	diry = -1;
	negdirection = SOUTH;
    } else if (direction == SOUTH) {
	dirx = 0;
	diry = 1;
	negdirection = NORTH;
    }
    var nrow = row + diry,
	ncolumn = column + dirx;
    this.grid[row][column] = this.grid[row][column] & ~direction;
    if (nrow >= 0 && nrow < this.rows &&
	ncolumn >= 0 && ncolumn < this.columns) {
	this.grid[nrow][ncolumn] = this.grid[nrow][ncolumn] & ~negdirection;
    }
}

Grid.prototype.render = function(ctx) {
    var cellSize = 10;
    var r, c;
    ctx.save();
    ctx.translate(2, 2);
    for (r = 0; r < this.rows; r++) {
	var row = this.grid[r];
	for (c = 0; c < this.columns; c++) {
	    var cell = row[c];
	    var left = c * cellSize,
		top = r * cellSize,
		right = (c + 1) * cellSize,
		bottom = (r + 1) * cellSize;
	    // ctx.strokeStyle = 'rgba(0,0,0,0.1)';
	    // ctx.strokeRect(left, top, cellSize, cellSize);
	    // ctx.strokeStyle = 'black';
	    if ((cell & NORTH) != 0) {
	    	ctx.beginPath();
	    	ctx.moveTo(c * cellSize, r * cellSize);
	    	ctx.lineTo((c + 1) * cellSize, r * cellSize);
	    	ctx.stroke();
	    }
	    if ((cell & WEST) != 0) {
	    	ctx.beginPath();
	    	ctx.moveTo(left, top);
	    	ctx.lineTo(left, bottom);
	    	ctx.stroke();
	    }
	    if ((cell & SOUTH) != 0) {
	    	ctx.beginPath();
	    	ctx.moveTo(left, bottom);
	    	ctx.lineTo(right, bottom);
	    	ctx.stroke();
	    }
	    if ((cell & EAST) != 0) {
	    	ctx.beginPath();
	    	ctx.moveTo((c + 1) * cellSize, r * cellSize);
	    	ctx.lineTo((c + 1) * cellSize, (r + 1) * cellSize);
	    	ctx.stroke();
	    }
	}
    }
    ctx.restore();
}

function loop() {
//    requestAnimationFrame(loop);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    grid.render(ctx);
}

function binaryTree(grid) {
    var r, c;
    for (r = grid.rows - 1; r >= 0; r--) {
	for (c = 0; c < grid.columns; c++) {
	    if (c == grid.columns - 1) {
		if (r > 0) {
		    grid.link(r, c, NORTH);
		}
	    } else if (r == 0) {
		if (c < grid.columns) {
		    grid.link(r, c, EAST);
		}
	    } else if (Math.random() < 0.5) {
		grid.link(r, c, NORTH);
	    } else {
		grid.link(r, c, EAST);
	    }
	}
    }
}

function start(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');

    grid = new Grid(40, 140);
    binaryTree(grid);
    grid.link(grid.rows - 1, 0, WEST);
    grid.link(0, grid.columns - 1, EAST);
    requestAnimationFrame(loop);
}

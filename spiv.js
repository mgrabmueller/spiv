var canvas;
var ctx;
var running;
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

Grid.prototype.toLocation = function(row, column) {
    var l = row * this.columns + column;
    return l;
}

Grid.prototype.fromLocation = function(location) {
    return [Math.floor(location / this.columns),
            location % this.columns];
}

Grid.prototype.neighbours = function(location) {
    var pos = this.fromLocation(location),
        row = pos[0],
        column = pos[1];
    var ns = [];
    if (row > 0 && (this.grid[row][column] & NORTH) == 0) {
        ns.push(this.toLocation(row - 1, column));
    }
    if (row < this.rows - 1 && (this.grid[row][column] & SOUTH) == 0) {
        ns.push(this.toLocation(row + 1, column));
    }
    if (column > 0 && (this.grid[row][column] & WEST) == 0) {
        ns.push(this.toLocation(row, column - 1));
    }
    if (column < this.columns - 1 && (this.grid[row][column] & EAST) == 0) {
        ns.push(this.toLocation(row, column + 1));
    }
    return ns;
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
    var cellSize = 20;
    var r, c;
    var maxDist = Math.floor(Math.sqrt(this.columns * this.rows));
    for (var i in distances) {
         maxDist = Math.max(maxDist, distances[i]);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
            var loc = grid.toLocation(r, c)
            if (loc == startLoc) {
                ctx.fillStyle = 'blue';
                ctx.fillRect(left + 2, top + 2, cellSize - 4, cellSize - 4);
            } else if (loc == goalLoc) {
                ctx.fillStyle = 'red';
                ctx.fillRect(left + 2, top + 2, cellSize - 4, cellSize - 4);
            } else if (loc in visited) {
                var dist = distances[loc],
                    ratio = 1 - dist / maxDist;

                var red = Math.floor(255 * ratio),
                    green = 127 + Math.floor(128 * ratio),
                    blue = red;
                ctx.fillStyle = 'rgb(' + red + ',' + green + ',' + blue + ')';
                ctx.fillRect(left, top, cellSize, cellSize);
            }
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
    for (loc in frontier) {
        var pos = grid.fromLocation(frontier[loc]),
            r = pos[0],
            c = pos[1];
        ctx.fillStyle = 'lightblue';
        ctx.fillRect(c * cellSize+1, r * cellSize+1,
                     cellSize-2, cellSize-2);
    }
    if (goalReached) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        var curLoc = goalLoc,
            curPos = grid.fromLocation(curLoc),
            curR = curPos[0],
            curC = curPos[1],
            curDist = distances[curLoc];
        ctx.beginPath();
        ctx.moveTo(curC * cellSize + cellSize / 2,
                   curR * cellSize + cellSize / 2);
        while (distances[curLoc] > 0) {
            var ns = grid.neighbours(curLoc);
            for (var i in ns) {
                if (distances[ns[i]] == curDist - 1) {
                    curLoc = ns[i];
                    curDist = distances[curLoc];
                    break;
                }
            }
            curPos = grid.fromLocation(curLoc),
            curR = curPos[0],
            curC = curPos[1];
            ctx.lineTo(curC * cellSize + cellSize / 2,
                       curR * cellSize + cellSize / 2);
        }
        ctx.stroke();
    }

    ctx.restore();
}

function loop() {
    if (!running) {
        return;
    }

    requestAnimationFrame(loop);

    floodStep();
    grid.render(ctx);
}

var START = 0,
    FLOOD = 1,
    STOP = 2;
var floodState = START;
var floodSteps = 0;
var visited = {}, frontier = [], distances = {};
var startLoc = undefined;
var goalLoc = undefined;
var goalReached = false;

function stopFlood() {
    floodState = STOP;
    floodSteps = 0;
    visited = {};
    frontier = [];
    distances = {};
    startLoc = undefined;
    goalLoc = undefined;
    goalReached = false;
}

function floodStep() {
    if (floodState == START) {
        console.log('flooding...');
        startLoc = grid.toLocation(Math.floor(Math.random() * grid.rows), Math.floor(Math.random() * grid.columns));
        goalLoc = grid.toLocation(Math.floor(Math.random() * grid.rows), Math.floor(Math.random() * grid.columns));
        goalReached = false;
        visited = {};
        distances = {}
        visited[startLoc] = true;
        distances[startLoc] = 0;
        frontier = [startLoc];
        floodState = FLOOD;
        floodSteps = 0;
    } else if (floodState == FLOOD) {
        if (frontier.length == 0 || floodSteps > 10000) {
            console.log('flooding... done');
            floodState = STOP;
        } else {
            floodSteps++;
            var current = frontier.shift();
            if (current == goalLoc) {
                goalReached = true;
                frontier = [];
            } else {
                var dist = distances[current];
                var ns = grid.neighbours(current);
                for (i = 0; i < ns.length; i++) {
                    if (!(ns[i] in visited)) {
                        frontier.push(ns[i]);
                        visited[ns[i]] = true;
                        distances[ns[i]] = dist + 1;
                    }
                }
            }
        }
    } else if (floodState == STOP) {
        floodState = START;
        running = false;
    }
}

function sideWinder(grid) {
    var r, c;
    for (r = grid.rows - 1; r >= 0; r--) {
        c = 0;
        startc = 0;
        while (c < grid.columns) {
            if (r > 0 && (c == grid.columns - 1 || Math.random() < 0.5)) {
                var up = startc + Math.floor(Math.random() * (c - startc));
                grid.link(r, up, NORTH);
                startc = c + 1;
            } else if (c < grid.columns - 1) {
                grid.link(r, c, EAST);
            }
            c++;
        }
    }
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

function generate(alg) {
    grid = new Grid(20, 60);
    switch (alg) {
    case 'bintree':
        binaryTree(grid);
        break;
    case 'sidewinder':
        sideWinder(grid);
        break;
    default:
        binaryTree(grid);
        break;
    }
}

function new_maze(alg) {
    running = false;
    stopFlood();
    generate(alg);
    grid.render(ctx);
}

function start(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');

    generate('sidewinder');
    grid.render(ctx);
}

function solve() {
    stopFlood();
    floodState = START;
    running = true;
    requestAnimationFrame(loop);
}

function pause() {
    running = false;
}

function cont() {
    running = true;
    requestAnimationFrame(loop);
}

// hex.js - a simple hex-based 2d game engine with automatic world generation.
//
// Sources:
// [1] Jamis Buck: Mazes for programmers, The Pragmatic Programmers, 2015.
//
// [2] Jason Bevins, Libnoise Tutorial 3: Generating and rendering a
//     terrain height map, available from:
//     http://libnoise.sourceforge.net/tutorials/tutorial3.html

// When this is true, the screen is redrawn on the next animation
// frame.
var redraw = true;
var showUnloadedBlocks = true;
var showUnloadedTiles = true;
var scale = 0.5;

var worldSeed = 46;

var CHUNK_SIZE = 128;

var chunkMap = {};
var renderCanvas;
var renderContext;

function getChunk(x, y) {
    var chunkX = Math.floor(x / CHUNK_SIZE) - (x < 0 ? 1 : 0),
	chunkY = Math.floor(y / CHUNK_SIZE) - (y < 0 ? 1 : 0);
    console.log(x, y, chunkX, chunkY);
    if (!(chunkY in chunkMap)) {
	chunkMap[chunkY] = {};
    }
    if (!(chunkX in chunkMap[chunkY])) {
	renderChunk(renderCanvas, renderContext, chunkX, chunkY, CHUNK_SIZE, scale);
	chunkMap[chunkY][chunkX] = renderContext.getImageData(0, 0, CHUNK_SIZE, CHUNK_SIZE);
    }
    return chunkMap[chunkY][chunkX];
}

// Blocks are multiples of BLOCK_SIZE (around the origin of the X/Y
// axes, double the size).
var BLOCK_SIZE = 8;

// Object mapping block coordinates to blocks.
var blockMap = {};

// Number of currently allocated blocks.
var blockCount = 0;

// Number of currently allocated tiles.
var tileCount = 0;

var oceanLevel = 0.0;

var VERY_DRY = 0,
    DRY = 1,
    MODERATE = 2,
    WET = 3,
    VERY_WET = 4;

var colors =
    [
	{low: -1.0000, r:   0, g:   0, b: 128},
	{low: -0.2500, r:   0, g:   0, b: 255},
	{low:  0.0000, r:   0, g: 128, b: 255},
	{low:  0.0625, r: 240, g: 240, b:  64},
	{low:  0.1250, r:  32, g: 160, b:   0},
	{low:  0.3750, r: 224, g: 244, b:   0},
	{low:  0.7500, r: 128, g: 128, b: 128},
	{low:  0.8000, r: 240, g: 240, b: 240},
	{low:  1.0000, r: 255, g: 255, b: 255},
    ];

function interpolateColor(value) {
    var i;
    var loIdx, hiIdx = colors.length - 1;
    for (i in colors) {
	if (value < colors[i].low) {
	    hiIdx = i;
	    break;
	}
	loIdx = i;
    }
    var t = ((value - colors[loIdx].low) / (colors[hiIdx].low - colors[loIdx].low))*4/5;
    var r = Math.floor(t * (colors[hiIdx].r - colors[loIdx].r) + colors[loIdx].r),
	g = Math.floor(t * (colors[hiIdx].g - colors[loIdx].g) + colors[loIdx].g),
	b = Math.floor(t * (colors[hiIdx].b - colors[loIdx].b) + colors[loIdx].b);

    return [r, g, b];
}

function interFillBlock(block, x, y, size, random) {
    if (size >= 1) {
	var mid = Math.floor(size / 2);
	block.grid[y + mid][x + mid].height = (block.grid[y][x].height +
					       block.grid[y][x + size - 1].height +
					       block.grid[y + size - 1][x].height +
					       block.grid[y + size - 1][x + size - 1].height)/4 +
	    (random() * 10 - 5);
	var tile = block.grid[y + mid][x + mid];
	var h = 50 + Math.floor(Math.max(0, Math.min(200, tile.height)));
	tile.r = h;
	tile.g = h;
	tile.b = h;
	tile.color = 'rgb(' + h + ',' + h + ',' + h + ')';
	interFillBlock(block, x, y, mid, random);
	interFillBlock(block, x + mid, y, mid, random);
	interFillBlock(block, x, y + mid, mid, random);
	interFillBlock(block, x + mid, y + mid, mid, random);
    }
}

function fillBlock(block, x, y) {
    var idx = (block.blockX * BLOCK_SIZE + x) * 100000 + (block.blockY * BLOCK_SIZE + y);
    var random = makeRandom(idx);
    block.grid[0][0].height = random() * 200;
    block.grid[0][BLOCK_SIZE-1].height = random() * 200;
    block.grid[BLOCK_SIZE - 1][0].height = random() * 200;
    block.grid[BLOCK_SIZE - 1][BLOCK_SIZE - 1].height = random() * 200;
    interFillBlock(block, 0, 0, BLOCK_SIZE, random);
}

// Create a new block.
function makeBlock(blockX, blockY) {
    blockCount++;
    var block = {blockX: blockX,
		 blockY: blockY,
		 grid: {}};
    return block;
}

// Return the block containing the grid coordinate x/y.
function getBlock(x, y) {
    var blockX = (x < 0 ? (x / BLOCK_SIZE) - 1 : (x / BLOCK_SIZE)) | 0,
	blockY = (y < 0 ? (y / BLOCK_SIZE) - 1 : (y / BLOCK_SIZE)) | 0;
    if (!(blockY in blockMap)) {
	blockMap[blockY] = {};
    }
    if (!(blockX in blockMap[blockY])) {
	blockMap[blockY][blockX] = makeBlock(blockX, blockY);
    }
    return blockMap[blockY][blockX];
}

// Return true if the block containing the grid coordinate x/y is
// initialized.
function blockLoaded(x, y) {
    var blockX = (x < 0 ? (x / BLOCK_SIZE) - 1 : (x / BLOCK_SIZE)) | 0,
	blockY = (y < 0 ? (y / BLOCK_SIZE) - 1 : (y / BLOCK_SIZE)) | 0;
    return (blockY in blockMap) && (blockX in blockMap[blockY]);
}

// Create a new tile object.
function makeTile(x, y) {
    tileCount++;

    var hexSize2 = 16;
    var hexA2 = hexSize2 / 2.0,
	hexB2 = hexSize2 * Math.sqrt(3) / 2.0,
	hexHeight2 = hexSize2 * 2.0,
	hexWidth2 = hexB2 * 2.0;
    var cx = x * hexWidth2 + y * hexB2,
        cy = 3 * y * hexA2;

    var height = 0;

    var c = 128;
    while (c <= 1024) {
	height += noise.simplex2(cx/c, cy/c);
	height /= 2;
	c *= 2;
    }
    height += 0.2;
    height = Math.max(-1, Math.min(1, height));

    var color = interpolateColor(height),
	r = color[0],
	g = color[1],
	b = color[2];

    var col  = 'rgb(' + r + ',' + g + ',' + b + ')';
    return {x: x,
	    y: y,
	    cx: cx,
	    cy: cy,
	    r: r,
	    g: g,
	    b: b,
	    color: col,
	    height: 0,
	    visited: true};
}

// Return the tile at x/y.  It is created and initialized if it was
// not loaded before.
function getTile(x, y) {
    var block = getBlock(x, y),
	tileX = x % BLOCK_SIZE,
	tileY = y % BLOCK_SIZE;
    if (!(tileY in block.grid)) {
	block.grid[tileY] = {};
    }
    if (!(tileX in block.grid[tileY])) {
	block.grid[tileY][tileX] = makeTile(x, y);
    }
    return block.grid[tileY][tileX];
}

// Return true if the tile at x/y has been initialized.
function tileLoaded(x, y) {
    if (blockLoaded(x, y)) {
	var block = getBlock(x, y),
	    tileX = x % BLOCK_SIZE,
	    tileY = y % BLOCK_SIZE;
	return (tileY in block.grid) && (tileX in block.grid[tileY]);
    } else {
	return false;
    }
}

// Current player position in grid coordinates.
var playerPosX = 0,
    playerPosY = 0;

// If goalSet is true, the player should move towards the coordinates
// goalPosX/goalPosY.
var goalSet = false,
    goalPosX = 0,
    goalPosY = 0;

// Current mouse position (in screen coordinates.
var mouseX = 0,
    mouseY = 0;

// Viewport offset.
var offsetX = 0;
var offsetY = 0;

// selHex is true if a hex was clicked at, then selHexX/selHexY are
// the grid coordinates of the hex.
var selHex = false,
    selHexX = 0,
    selHexY = 0;

var frameX = 100,
    frameY = 30,
    frameWidth = 1000,
    frameHeight = 300;

var hexSize = 32;
var hexA = hexSize / 2.0,
    hexB = hexSize * Math.sqrt(3) / 2.0,
    hexHeight = hexSize * 2.0,
    hexWidth = hexB * 2.0;

var panSpeed = 10;
var DIR_W  = 0,
    DIR_E  = 1,
    DIR_NW = 2,
    DIR_SW = 3,
    DIR_NE = 4,
    DIR_SE = 5;

var DIR_OFS =
    [[-1,0], // W
     [+1,0], // E
     [0,-1], // NW
     [-1,+1], // SW
     [+1,-1], // NE
     [0,+1] // SE
    ];

var KEY_LEFT = 37,
    KEY_RIGHT = 39,
    KEY_UP = 38,
    KEY_DOWN = 40,
    KEY_PLUS = 61,
    KEY_MINUS = 173;

var input =
    {keyDown: {}};

var gameTicks = 0;

// Map grid coordinates to screen coordinates of the hex center.
function hexToScreenCoord(x, y) {
    var cx = (x * hexWidth + y * hexB),
        cy = (3 * y * hexA);
    return [cx, cy];
}

// Calculate the Euclidean distance between two points.
function distance(x1, y1, x2, y2) {
    var dx = x2 - x1,
	dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Map screen coordinates to grid coordinates.
//
// This is not the best (fast) approach: we first determine the grid
// position of a target hex, then check if the screen coordinates is
// closer to the origin of th two northern neighbours, correcting if
// necessary.
function screenToHexCoord(x, y) {
    var j = Math.floor(((y + hexSize) / (3*hexHeight/4)));
    var i = Math.floor(((x - (j - 1) * hexB) / hexWidth));

    var nwx = i + DIR_OFS[DIR_NW][0],
	nwy = j + DIR_OFS[DIR_NW][1],
	nex = i + DIR_OFS[DIR_NE][0],
	ney = j + DIR_OFS[DIR_NE][1];
    var nw_center = hexToScreenCoord(nwx, nwy),
	ne_center = hexToScreenCoord(nex, ney),
	center = hexToScreenCoord(i, j);

    var nwdist = distance(nw_center[0], nw_center[1], x, y),
	nedist = distance(ne_center[0], ne_center[1], x, y),
	dist = distance(center[0], center[1], x, y);

    if (nwdist < nedist) {
	if (nwdist < dist) {
	    return [nwx, nwy]; // nwdist < nedist && nwdist < dist
	} else {
	    return [i, j]; // dist <= nedist < nedist
	}
    } else {
	if (nedist < dist) { // nedist <= nwdist && nedist < dist
	    return [nex, ney];
	} else { // dist <= nedist <= nwdist
	    return [i, j];
	}
    }
}

function renderCell(canvas, ctx, x, y, mouseCol, mouseRow) {
    var strokeHexes = false,
	fillHexes = true;

    var center = hexToScreenCoord(x, y);
    var cx = center[0],
	cy = center[1];
    var doFill = true;

    if (tileLoaded(x, y)) {
	var tile = getTile(x, y);
	if (tile.visited){
	    ctx.fillStyle = tile.color;
	} else {
	    ctx.fillStyle = 'rgb(100,100,100)';
	}
    } else if (blockLoaded(x, y)) {
	if (!showUnloadedTiles) {
	    doFill = false;
	}
	ctx.fillStyle = 'rgb(10,10,10)';
    } else {
	if (!showUnloadedBlocks) {
	    doFill = false;
	}
	ctx.fillStyle = 'black';
    }
    if (doFill && fillHexes) {
	ctx.beginPath()
	ctx.moveTo(cx - hexB, cy - hexA);
	ctx.lineTo(cx, cy - hexSize);
	ctx.lineTo(cx + hexB, cy - hexA);
	ctx.lineTo(cx + hexB, cy + hexA);
	ctx.lineTo(cx, cy + hexSize);
	ctx.lineTo(cx - hexB, cy + hexA);
	ctx.lineTo(cx - hexB, cy - hexA);
	ctx.fill();
    }

    if (doFill && strokeHexes) {
	ctx.beginPath()
	ctx.strokeStyle = 'white';
	ctx.moveTo(cx - hexB, cy - hexA);
	ctx.lineTo(cx, cy - hexSize);
	ctx.lineTo(cx + hexB, cy - hexA);
	ctx.lineTo(cx + hexB, cy + hexA);
	ctx.lineTo(cx, cy + hexSize);
	ctx.lineTo(cx - hexB, cy + hexA);
	ctx.lineTo(cx - hexB, cy - hexA);
	ctx.stroke();
    }
}

// Render the map at chunk position `chunkX'/`chunkY' (which is a
// square of chunkSize) onto the given `canvas' (which must hold at
// least `chunkSize'*`chunkSize' pixels).  The map is scaled by the
// factor `scale'.
function renderChunk(canvas, ctx, chunkX, chunkY, chunkSize, scale) {
    ctx.save();
    ctx.translate(-chunkX * chunkSize, -chunkY * chunkSize);
    ctx.scale(scale, scale);

    ctx.clearRect(0, 0, chunkSize, chunkSize);

    var startPos = screenToHexCoord((chunkX * chunkSize) / scale, (chunkY * chunkSize - hexA) / scale);
    var startCol = startPos[0],
	startRow = startPos[1];
    var endPos1 = screenToHexCoord(((chunkX+1) * chunkSize + hexWidth/2) / scale, (chunkY * chunkSize - hexA) / scale);
    var endCol = endPos1[0];
    var endPos2 = screenToHexCoord(((chunkX+1) * chunkSize + hexWidth/2) / scale, ((chunkY+1)*chunkSize + hexA) / scale);
    var endRow = endPos2[1];

    var xskip = 0;
    var rowCnt = 0;
    var x, y;
    for (y = startRow; y <= endRow; y++) {
	if ((rowCnt & 1) == 1) {
	    xskip++;
	}
	rowCnt++;
        for (x = startCol - xskip; x <= endCol - xskip; x++) {
	    renderCell(canvas, ctx, x, y, -1, -1);
	}
    }
    ctx.restore();
}

function update() {
    if (KEY_LEFT in input.keyDown) {
	offsetX += panSpeed;
	redraw = true;
    }
    if (KEY_RIGHT in input.keyDown) {
	offsetX -= panSpeed;
	redraw = true;
    }
    if (KEY_UP in input.keyDown) {
	offsetY += panSpeed;
	redraw = true;
    }
    if (KEY_DOWN in input.keyDown) {
	offsetY -= panSpeed;
	redraw = true;
    }
    if (KEY_PLUS in input.keyDown) {
	if (scale < 2) {
	    offsetX = (offsetX - frameWidth/2)/ (scale*hexSize);
	    offsetY = (offsetY - frameHeight/2)/ (scale*hexSize);
	    scale *= 1.11;
	    offsetX = offsetX * (scale*hexSize) + frameWidth/2;
	    offsetY = offsetY * (scale*hexSize) + frameHeight/2;
	    redraw = true;
	}
    }
    if (KEY_MINUS in input.keyDown) {
	if (scale > 0.2) {
	    offsetX = (offsetX - frameWidth/2)/ (scale*hexSize);
	    offsetY = (offsetY - frameHeight/2)/ (scale*hexSize);
	    scale /= 1.11;
	    offsetX = offsetX * (scale*hexSize) + frameWidth/2;
	    offsetY = offsetY * (scale*hexSize) + frameHeight/2;
	    redraw = true;
	}
    }
    if (selHex && !goalSet) {
	goalSet = true;
	goalPosX = selHexX;
	goalPosY = selHexY;
    }
    if (goalSet) {
	if (playerPosX < goalPosX) {
	    playerPosX++;
	} else if (playerPosX > goalPosX) {
	    playerPosX--;
	}
	if (playerPosY < goalPosY) {
	    playerPosY++;
	} else if (playerPosY > goalPosY) {
	    playerPosY--;
	}
	if (playerPosX == goalPosX && playerPosY == goalPosY) {
	    goalSet = false;
	}
	var tile = getTile(playerPosX, playerPosY);
	var d;
	for (d in DIR_OFS) {
	    getTile(playerPosX + DIR_OFS[d][0], playerPosY + DIR_OFS[d][1]);
	}
	tile.visited = true;
	redraw = true;
    }

    gameTicks++;
}

function render(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var x, y;
    for (y = 0; y < canvas.height; y += CHUNK_SIZE) {
	for (x = 0; x < canvas.width; x += CHUNK_SIZE) {
	    var chunk = getChunk(x + offsetX, y + offsetY);
	    ctx.putImageData(chunk, x - offsetX % CHUNK_SIZE, y - offsetY % CHUNK_SIZE);
	}
    }
}

function loop(canvas) {
    requestAnimationFrame(function() {loop(canvas)});
    update();
    if (redraw) {
	render(canvas);
	redraw = false;
    }
}

function start(canvasId) {
    renderCanvas = document.createElement('canvas');
    renderCanvas.width = CHUNK_SIZE;
    renderCanvas.height = CHUNK_SIZE;
    renderContext = renderCanvas.getContext('2d');

    var canvas = document.getElementById(canvasId);

    noise.seed(worldSeed);

    frameX = 0;//120;
    frameY = 0;//60;
    offsetX = frameX;
    offsetY = frameY;
    function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 6;
	frameWidth = canvas.width - frameX*2;
	frameHeight = canvas.height - frameY*2;
	redraw = true;
    }

//    resize();
//    window.addEventListener("resize", resize);

    canvas.addEventListener("mousemove",
			      function(e) {
				  var x = e.clientX,
				      y = e.clientY;
				  mouseX = x;
				  mouseY = y;
				  redraw = true;
			      });
    document.addEventListener("keydown",
			    function(e) {
				input.keyDown[e.which] = true;
				switch (e.which) {
				case 0:
				    break;
				default:
				    console.log("key down:", e.which);
				    break
				}
			    });
    document.addEventListener("keyup",
			    function(e) {
				delete input.keyDown[e.which];
			    });

    canvas.addEventListener("mouseup", function (e) {
        var mpos = screenToHexCoord((e.clientX - offsetX)/scale, (e.clientY - offsetY)/scale);
	var mouseRow = mpos[1],
	    mouseCol = mpos[0];
	selHex = true;
	selHexX = mouseCol;
	selHexY = mouseRow;
	redraw = true;
    });

    var i, j;
    var deltaX = 80, deltaY = 40;
    for (i = playerPosX - deltaX; i <= playerPosX + deltaX; i++) {
	for (j = playerPosY - deltaY; j <= playerPosY + deltaY; j++) {
	    getTile(i, j).visited = true;
	}
    }
//    render(canvas);

    requestAnimationFrame(function() {loop(canvas)});
}

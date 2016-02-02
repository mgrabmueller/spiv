// When this is true, the screen is redrawn on the next animation
// frame.
var redraw = true;
var showUnloadedBlocks = true;
var showUnloadedTiles = true;
var scale = 1;

var globalSeedInt = 46;

// Blocks are multiples of BLOCK_SIZE (around the origin of the X/Y
// axes, double the size).
var BLOCK_SIZE = 8;

// Object mapping block coordinates to blocks.
var blockMap = {};

// Number of currently allocated blocks.
var blockCount = 0;

// Number of currently allocated tiles.
var tileCount = 0;

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
    // var x, y;
    // for (y = 0; y < BLOCK_SIZE; y++) {
    // 	block.grid[y] = {};
    // 	for (x = 0; x < BLOCK_SIZE; x++) {
    // 	    block.grid[y][x] = makeTile(blockX * BLOCK_SIZE + (blockX < 0 ? x + 1 : x), blockY * BLOCK_SIZE + (blockY < 0 ? y + 1 : y));
    // 	}
    // }
    // fillBlock(block);
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

    var r = 100,
	g = 200,
	b = 200;
    var random = makeRandom(x * 10000 + y);
//    var col  = 'rgb(' + r + ',' + g + ',' + b + ')';

    var frequenciesX = [0.1, 0.2, 0.4, 0.8, 0.16, 0.32];
    var amplitudesX  = [0.6, 0.4, 0.7, 0.3,  0.2,  0.1];
    var frequenciesY = [0.1, 0.2, 0.4, 0.8, 0.16, 0.32];
    var amplitudesY  = [0.3, 0.8, 0.6, 0.5,  0.3,  0.2];
    var sum = 0;
    var i, j;
    for (j = 0; j < frequenciesY.length; j++) {
	for (i = 0; i < frequenciesX.length; i++) {
	    sum += (Math.sin(cx/frequenciesX[i]) * amplitudesX[i] +
	     Math.sin(cy/frequenciesY[j]) * amplitudesY[j]);
	}
    }
    sum /= 2 * frequenciesY.length * frequenciesX.length;
    
    var height = Math.max(0, Math.min(1, (Math.sin(cx*hexWidth2) + Math.cos(cy*hexHeight2))/2));

    sum= noiseAt(cx/40, cy/40);
    var height = sum;
    var h;
    if (height > 0.6) { // snow
	r = 255;
	g = 255;
	b = 255;
    } else if (height > 0.5){ // rock
	r = 150;
	g = 150;
	b = 150;
    } else if (height > 0.45){ // dirt
	r = 150;
	g = 150;
	b = 0;
    } else if (height > 0.3){ // forest
	r = 80;
	g = 80;
	b = 30;
    } else if (height > 0.17){ // grass
	r = 30;
	g = 120;
	b = 30;
    } else if (height > 0.1){ // sand
	r = 240;
	g = 220;
	b = 50;
    } else if (height > -0.05){ // shallow water
	r = 80;
	g = 80;
	b = 200;
    } else if (height > -0.4){ // water
	r = 50;
	g = 50;
	b = 170;
    } else { // deep water
	r = 30;
	g = 30;
	b = 120;
    }
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

function render(canvas) {
    var ctx = canvas.getContext('2d');

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    var strokeHexes = false,
	fillHexes = true;

    var mpos = screenToHexCoord((mouseX - offsetX)/scale, (mouseY - offsetY)/scale);
    var mouseRow = mpos[1],
	mouseCol = mpos[0];
    
    var x, y;

    ctx.strokeStyle = 'black';

    var startPos = screenToHexCoord((frameX - offsetX)/scale, (frameY - offsetY - hexA)/scale);
    var startCol = startPos[0],
	startRow = startPos[1];
    var endPos = screenToHexCoord((frameX - offsetX + frameWidth + hexWidth/2)/scale, (frameY - offsetY - hexA)/scale);
    var endCol = endPos[0],
	endRow = endPos[1];
    var endPos2 = screenToHexCoord((frameX - offsetX + frameWidth + hexWidth/2)/scale, (frameY - offsetY + frameHeight + hexA)/scale);
    var endCol2 = endPos2[0],
	endRow2 = endPos2[1];

    var maxDrawX = 80,
	maxDrawY = 40;
    while (endRow2 - startRow > maxDrawY) {
	startRow++;
	endRow2--;
    }
    while (endCol - startCol > maxDrawX) {
	startCol++;
	endCol--;
    }
    var xskip = 0;
    var rowCnt = 0;
    for (y = startRow; y <= endRow2; y++) {
	if ((rowCnt & 1) == 1) {
	    xskip++;
	}
	rowCnt++;
        for (x = startCol - xskip; x <= endCol - xskip; x++) {
	    var center = hexToScreenCoord(x, y);
	    var cx = center[0],
		cy = center[1];
	    var doFill = true;
	    
	    if (tileLoaded(x, y)) {
		var tile = getTile(x, y);
		if (x == playerPosX && y == playerPosY) {
		    ctx.fillStyle = 'red';
		} else {
		    if (tile.visited){
			ctx.fillStyle = tile.color;
		    } else {
			ctx.fillStyle = 'rgb(100,100,100)';
		    }
		}
//		ctx.strokeText(tile.height + '', cx, cy);
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
//            ctx.strokeText(x + ',' + y, cx, cy);
	    if (x == mouseCol && y == mouseRow) {
		ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
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
        }
    }
    ctx.restore();

    if (frameX > 0) {
	ctx.strokeStyle = 'white';
	ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(10, canvas.height - 60, 100, 58);
    ctx.strokeStyle = 'white';
    ctx.strokeText(mpos[0] + ',' + mpos[1], 20, canvas.height - 6);
    ctx.strokeText('G: ' + goalSet + ', scale: ' + scale, 20, canvas.height - 34);
    ctx.strokeText('T: ' + tileCount + ', B: ' + blockCount, 20, canvas.height - 48);
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

function loop(canvas) {
    requestAnimationFrame(function() {loop(canvas)});
    update();
    if (redraw & gameTicks % 2 == 0) {
	render(canvas);
	redraw = false;
    }
}

// function noise(x, y) {
//     var frequenciesX = [1/2, 1/4, 1/8, 1/16, 1/32, 1/64],
// 	amplitudesX  = [0.2, 0, 0, 0.1, 0, 0.2];
//     var frequenciesY = [1/2, 1/4, 1/8, 1/16, 1/32, 1/64],
// 	amplitudesY  = [0.4, 0, 0.2, 0, 0.1, 0];
//     var i, j;
//     var sum;
//     sum = 0;
//     for (j in frequenciesY) {
// 	for (i in frequenciesX) {
// 	    sum += Math.sin(x / frequenciesX[i]) * amplitudesX[i] + Math.sin(y / frequenciesY[j]) * amplitudesY[j];
// 	}
//     }
//     sum /= 8;
//     return Math.max(0, Math.min(1, (sum + 1)));
// }

function noiseAt(x, y) {
    return noise.perlin2(x/32, y/32);
}

function start(canvasId) {
    var canvas = document.getElementById(canvasId);

    frameX = 120;
    frameY = 60;
    offsetX = frameX;
    offsetY = frameY;
    function resize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 6;
	frameWidth = canvas.width - frameX*2;
	frameHeight = canvas.height - frameY*2;
	redraw = true;
    }

    resize();
//    offsetX = frameX + (frameWidth) / 2 - playerPosX * hexWidth;
//    offsetY = frameY + (frameHeight) / 2 - playerPosY * hexHeight;
    window.addEventListener("resize", resize);
    
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
    requestAnimationFrame(function() {loop(canvas)});
}

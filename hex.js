// When this is true, the screen is redrawn on the next animation
// frame.
var redraw = true;
var showUnloadedBlocks = true;
var showUnloadedTiles = true;

var globalSeedInt = 46;

// Blocks are multiples of BLOCK_SIZE (around the origin of the X/Y
// axes, double the size).
var BLOCK_SIZE = 10;

// Object mapping block coordinates to blocks.
var blockMap = {};

// Number of currently allocated blocks.
var blockCount = 0;

// Number of currently allocated tiles.
var tileCount = 0;

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
    var r = 100,
	g = 200,
	b = 200;
    var col  = 'rgb(' + r + ',' + g + ',' + b + ')';
    return {x: x,
	    y: y,
	    r: r,
	    g: g,
	    b: b,
	    color: col,
	    visited: false};
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

function recalc() {
    hexA = hexSize / 2.0;
    hexB = hexSize * Math.sqrt(3) / 2.0;
    hexHeight = hexSize * 2.0;
    hexWidth = hexB * 2.0;
}

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

// Map grid coordinates to screen coordinates of the hex center
// (taking panning into account).
function hexToScreenCoord(x, y) {
    var cx = x * hexWidth + y * hexB,
        cy = 3 * y * hexA;
    return [cx + offsetX, cy + offsetY];
}

// Calculate the Euclidean distance between two points.
function distance(x1, y1, x2, y2) {
    var dx = x2 - x1,
	dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Map screen coordinates to grid coordinates (taking panning into
// account).
//
// This is not the best (fast) approach: we first determine the grid
// position of a target hex, then check if the screen coordinates is
// closer to the origin of th two northern neighbours, correcting if
// necessary.
function screenToHexCoord(x, y) {
    var j = Math.floor((y - offsetY + hexSize) / (3*hexHeight/4));
    var i = Math.floor((x - offsetX - (j - 1) * hexB) / hexWidth);

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
//    ctx.strokeRect(1, 1, canvas.width-2, canvas.height-2);

    var strokeHexes = false,
	fillHexes = true;

    var mpos = screenToHexCoord(mouseX, mouseY);
    var mouseRow = mpos[1],
	mouseCol = mpos[0];
    
    var x, y;

    ctx.strokeStyle = 'black';

    var startPos = screenToHexCoord(frameX, frameY - hexA);
    var startCol = startPos[0],
	startRow = startPos[1];
    var endPos = screenToHexCoord(frameX + frameWidth + hexWidth/2, frameY - hexA);
    var endCol = endPos[0],
	endRow = endPos[1];
    var endPos2 = screenToHexCoord(frameX + frameWidth + hexWidth/2, frameY + frameHeight + hexA);
    var endCol2 = endPos2[0],
	endRow2 = endPos2[1];

    var scrX = offsetX,
	scrY = offsetY;
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
		if (x == playerPosX && y == playerPosY) {
		    ctx.fillStyle = 'red';
		} else {
		    var tile = getTile(x, y);
		    if (tile.visited){
			ctx.fillStyle = tile.color;
		    } else {
			ctx.fillStyle = 'rgb(100,100,100)';
		    }
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
    ctx.strokeText('G: ' + goalSet, 20, canvas.height - 34);
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
	if (hexSize < 60) {
	    offsetX = (offsetX - frameWidth/2)/ hexSize;
	    offsetY = (offsetY - frameHeight/2)/ hexSize;
	    hexSize += 1;
	    recalc();
	    offsetX = offsetX * hexSize + frameWidth/2;
	    offsetY = offsetY * hexSize + frameHeight/2;
	    redraw = true;
	}
    }
    if (KEY_MINUS in input.keyDown) {
	if (hexSize > 10) {
	    offsetX = (offsetX - frameWidth/2)/ hexSize;
	    offsetY = (offsetY - frameHeight/2)/ hexSize;
	    hexSize -= 1;
	    recalc();
	    offsetX = offsetX * hexSize + frameWidth/2;
	    offsetY = offsetY * hexSize + frameHeight/2;
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
    if (redraw) {
	render(canvas);
	redraw = false;
    }
}

function start(canvasId) {
    var canvas = document.getElementById(canvasId);

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

    resize();
    offsetX = frameX + (frameWidth) / 2 - playerPosX * hexWidth;
    offsetY = frameY + (frameHeight) / 2 - playerPosY * hexHeight;
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
        var mpos = screenToHexCoord(e.clientX, e.clientY);
	var mouseRow = mpos[1],
	    mouseCol = mpos[0];
	selHex = true;
	selHexX = mouseCol;
	selHexY = mouseRow;
	redraw = true;
    });

    getTile(playerPosX, playerPosY);
    requestAnimationFrame(function() {loop(canvas)});
}

// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

    window.xor4096 = impl;
if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);

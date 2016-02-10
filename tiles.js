// Experiment with asynchronously rendered tiles.

var PROGRESS_LIMIT = 20;
var WORKER_COUNT   = 3;

var tiles = {
    ticks: 0,
    offsetX: 0,
    offsetY: 0,
    tileSize: 128,
    renderCanvas: null,
    renderCtx: null,
    tileMap: [],
    rendering: false,
    workers: [],
    workerQueue: 0,
    postedInFrame: 0,
    tileCount: 0,
    tilesInProgress: 0,
    keyDown: {},
    redraw: true,
    scaleTable: [0.5, 0.6, 0.8, 0.9, 1.0, 1.2, 1.4, 1.8, 2.2, 3.0, 3.4],
    scaleIndex: 4,
    debug: false,
    color: true,
    lighting: true
};

function getHeightMap(tileX, tileY, scaleIndex, buffer, color, lighting) {
    if (color == tiles.color && lighting == tiles.lighting) {
	var canvas = tiles.renderCanvas,
	    ctx = tiles.renderCtx;
	ctx.clearRect(0, 0, tiles.tileSize, tiles.tileSize);

	var imageData = ctx.createImageData(tiles.tileSize, tiles.tileSize);
	imageData.data.set(buffer);
	tiles.tileMap[scaleIndex][tileY][tileX] = {rendered: true,
						   imageData: imageData};
	tiles.tileCount++;
	tiles.redraw = true;
    }
    tiles.tilesInProgress--;
}

function receiveHeightMap(e) {
    var data = e.data;
    getHeightMap(data.tileX, data.tileY, data.scaleIndex, data.buffer, data.color, data.lighting);
}

function getTile(tileX, tileY, scaleIndex) {
    tiles.tileMap[scaleIndex] = tiles.tileMap[scaleIndex] || [];
    tiles.tileMap[scaleIndex][tileY] = tiles.tileMap[scaleIndex][tileY] || [];

    if (!(tileX in tiles.tileMap[scaleIndex][tileY])) {
        if (tiles.tilesInProgress < PROGRESS_LIMIT) {
            tiles.postedInFrame++;
            tiles.workers[tiles.workerQueue].postMessage({tileX: tileX,
							  tileY: tileY,
							  tileSize: tiles.tileSize,
							  scaleIndex: tiles.scaleIndex,
							  scale: tiles.scaleTable[tiles.scaleIndex],
							  color: tiles.color,
							  lighting: tiles.lighting});
	    tiles.workerQueue = (tiles.workerQueue + 1) % tiles.workers.length;
	    tiles.tilesInProgress++;
	    tiles.tileMap[scaleIndex][tileY][tileX] = {rendered: false, scheduled: true};
        } else {
            return {rendered: false, scheduled: false};
        }
    }
    return tiles.tileMap[scaleIndex][tileY][tileX];
}

function update() {
    tiles.ticks++;
    if (39 in tiles.keyDown) {
	tiles.offsetX -= 10;
	tiles.redraw = true;
    }
    if (37 in tiles.keyDown) {
	tiles.offsetX += 10;
	tiles.redraw = true;
    }
    if (40 in tiles.keyDown) {
	tiles.offsetY -= 10;
	tiles.redraw = true;
    }
    if (38 in tiles.keyDown) {
	tiles.offsetY += 10;
	tiles.redraw = true;
    }
    if (173 in tiles.keyDown) {
	if (tiles.scaleIndex > 0) {
	    tiles.scaleIndex--;
	    tiles.redraw = true;
	}
    }
    if (61 in tiles.keyDown) {
	if (tiles.scaleIndex < tiles.scaleTable.length-1) {
	    tiles.scaleIndex++;
	    tiles.redraw = true;
	}
    }
    if (tiles.ticks % 60 == 0) {
	tiles.redraw = true;
    }
    if (tiles.ticks % 60*10 == 0 && tiles.tileCount > 2000) {
	for (var sIdx in tiles.tileMap) {
	    for (var y in tiles.tileMap[sIdx]) {
		for (x in tiles.tileMap[sIdx][y]) {
		    var tile = tiles.tileMap[sIdx][y][x];
		    if (tile.rendered && tiles.ticks - tile.lastTouched > 160*5) {
			delete tiles.tileMap[sIdx][y][x];
			tiles.tileCount--;
		    }
		}
	    }
	}
    }
}

function render() {
    var i;
    var tile;
    var canvas = tiles.canvas,
        ctx = tiles.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    tiles.postedInFrame = 0;
    var x, y;
    for (y = 0; y < canvas.height; y += tiles.tileSize) {
	for (x = 0; x < canvas.width + tiles.tileSize-1; x += tiles.tileSize) {
	    var tileX = Math.floor((x - tiles.offsetX) / tiles.tileSize),
		tileY = Math.floor((y - tiles.offsetY) / tiles.tileSize);
	    var tile = getTile(tileX, tileY, tiles.scaleIndex);
	    if (tile.rendered) {
		ctx.putImageData(tile.imageData,
				 tileX * tiles.tileSize + tiles.offsetX,
				 tileY * tiles.tileSize + tiles.offsetY
				);
		tile.lastTouched = tiles.ticks;
	    } else {
		if (tile.scheduled) {
		    ctx.fillStyle = "rgba(255,0,0,0.5)";
		    ctx.fillRect(tileX * tiles.tileSize + tiles.offsetX,
				 tileY * tiles.tileSize + tiles.offsetY,
				 tiles.tileSize,
				 tiles.tileSize);
		}
	    }
        }
    }

    ctx.strokeText("Ticks: " + tiles.ticks, 10, 10);
    ctx.strokeText("In progress: " + tiles.tilesInProgress, 10, 24);
    ctx.strokeText("Tiles: " + tiles.tileCount + ' (' + (((tiles.tileCount * tiles.tileSize * tiles.tileSize * 4) / (1024*1024)).toPrecision(3)) + ' MB)', 10, 38);
    ctx.strokeText("Pos: " + -tiles.offsetX + "/" + -tiles.offsetY + ", Scale: " + tiles.scaleTable[tiles.scaleIndex].toPrecision(2), 10, 52);
}

function loop() {
    requestAnimationFrame(loop);
    update();
    if (tiles.redraw) {
	render();
	tiles.redraw = false;
    }
}

function keydownHandler(e) {
    tiles.keyDown[e.which] = true;
}

function keyupHandler(e) {
    console.log("up: ", e.which);
    switch (e.which) {
    case 67:
	tiles.color = !tiles.color;
	tiles.redraw = true;
	tiles.tileMap = [];
	tiles.tileCount = 0;
	break;
    case 76:
	tiles.lighting = !tiles.lighting;
	tiles.redraw = true;
	tiles.tileMap = [];
	tiles.tileCount = 0;
	break;
    }
    delete tiles.keyDown[e.which];
}

function start(canvasId) {
    var i;
    for (i = 0; i < WORKER_COUNT; i++) {
	var worker = new Worker("heightmap-worker.js");
	worker.onmessage = receiveHeightMap;
	tiles.workers.push(worker);
    }

    tiles.canvas = document.getElementById(canvasId),
    tiles.canvas.width = window.innerWidth;
    tiles.canvas.height = window.innerHeight-6;
    tiles.ctx = tiles.canvas.getContext("2d");

    tiles.renderCanvas = document.createElement("canvas");
    tiles.renderCanvas.width = tiles.tileSize;
    tiles.renderCanvas.height = tiles.tileSize;
    tiles.renderCtx = tiles.renderCanvas.getContext("2d");

    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", keyupHandler);
    requestAnimationFrame(loop);
}

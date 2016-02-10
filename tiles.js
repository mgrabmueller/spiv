// Experiment with asynchronously rendered tiles.

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
    redraw: true
};

function getHeightMap(tileX, tileY, buffer) {
    var canvas = tiles.renderCanvas,
	ctx = tiles.renderCtx;
    ctx.clearRect(0, 0, tiles.tileSize, tiles.tileSize);

    var imageData = ctx.createImageData(tiles.tileSize, tiles.tileSize);
    imageData.data.set(buffer);
    tiles.tileMap[tileY][tileX] = {rendered: true,
				   imageData: imageData};
    tiles.tileCount++;
    tiles.tilesInProgress--;
    tiles.redraw = true;
}

function receiveHeightMap(e) {
    var data = e.data;
    getHeightMap(data.tileX, data.tileY, data.buffer);
}

function getTile(tileX, tileY) {
    tiles.tileMap[tileY] = tiles.tileMap[tileY] || [];

    if (!(tileX in tiles.tileMap[tileY])) {
        if (tiles.tilesInProgress < 10) {
            tiles.postedInFrame++;
            tiles.workers[tiles.workerQueue].postMessage({tileX: tileX,
							  tileY: tileY,
							  tileSize: tiles.tileSize});
	    tiles.workerQueue = (tiles.workerQueue + 1) % tiles.workers.length;
	    tiles.tilesInProgress++;
	    tiles.tileMap[tileY][tileX] = {rendered: false, scheduled: true};
        } else {
            return {rendered: false, scheduled: false};
        }
    }
    return tiles.tileMap[tileY][tileX];
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
    if (tiles.ticks % 60 == 0) {
	tiles.redraw = true;
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
	    var tile = getTile(tileX, tileY);
	    if (tile.rendered) {
		ctx.putImageData(tile.imageData,
				 tileX * tiles.tileSize + tiles.offsetX,
				 tileY * tiles.tileSize + tiles.offsetY
				);
	    } else {
		if (tile.scheduled) {
		    ctx.fillStyle = "white";
		} else {
		    ctx.fillStyle = 'lightgray';
		}
		ctx.fillRect(tileX * tiles.tileSize + tiles.offsetX,
			     tileY * tiles.tileSize + tiles.offsetY,
			     tiles.tileSize,
			     tiles.tileSize);
		ctx.strokeRect(tileX * tiles.tileSize + tiles.offsetX,
			     tileY * tiles.tileSize + tiles.offsetY,
			     tiles.tileSize,
			     tiles.tileSize);
		ctx.beginPath();
		ctx.moveTo(tileX * tiles.tileSize + tiles.offsetX,
			   tileY * tiles.tileSize + tiles.offsetY);
		ctx.lineTo(tileX * tiles.tileSize + tiles.offsetX + tiles.tileSize,
			   tileY * tiles.tileSize + tiles.offsetY + tiles.tileSize);
		ctx.moveTo(tileX * tiles.tileSize + tiles.offsetX,
			   tileY * tiles.tileSize + tiles.offsetY + tiles.tileSize);
		ctx.lineTo(tileX * tiles.tileSize + tiles.offsetX + tiles.tileSize,
			   tileY * tiles.tileSize + tiles.offsetY);
		ctx.stroke();
			     
			     
	    }
        }
    }

    ctx.strokeText("Ticks: " + tiles.ticks, 10, 10);
    ctx.strokeText("In progress: " + tiles.tilesInProgress, 10, 24);
    ctx.strokeText("Tiles: " + tiles.tileCount + ' ( ' + ((tiles.tileCount * tiles.tileSize * tiles.tileSize * 4) / (1024*1024)) + ' MB)', 10, 38);
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
    delete tiles.keyDown[e.which];
}

function start(canvasId) {
    var i;
    for (i = 0; i < 2; i++) {
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

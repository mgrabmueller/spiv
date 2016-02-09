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
    worker: null,
    postedInFrame: 0
};

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

function interpolateColor(value, x, y) {
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

function renderTile(heightMap, doColor, lighting) {
    var ctx = tiles.renderCtx;
    var x, y;
    var shadowVal = 30;
    var lift = 0.2
    for (y = 0; y < tiles.tileSize; y++) {
	for (x = 0; x < tiles.tileSize; x++) {
            var height = heightMap[y][x] + lift;
	    var gray = Math.floor(((height + 1) / 2) * 255);
	    var color = doColor ? interpolateColor(height, x, y) : [gray, gray, gray],
		r = color[0],
		g = color[1],
		b = color[2];

	    if (lighting && height > 0.0 && x > 0) {
		if (heightMap[y][x-1] + lift > height) {
		    r = Math.max(0, r - shadowVal);
		    g = Math.max(0, g - shadowVal);
		    b = Math.max(0, b - shadowVal);
		}
	    }
	    if (lighting && height > 0.0 && y > 0) {
		if (heightMap[y-1][x] + lift > height) {
		    r = Math.max(0, r - shadowVal);
		    g = Math.max(0, g - shadowVal);
		    b = Math.max(0, b - shadowVal);
		}
	    }
	    if (lighting && height > 0.0 && x > 0 && y > 0) {
		if (heightMap[y-1][x-1] + lift > height) {
		    r = Math.max(0, r - shadowVal);
		    g = Math.max(0, g - shadowVal);
		    b = Math.max(0, b - shadowVal);
		}
	    }
	    ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
	    ctx.strokeRect(x, y, 1, 1);
	}
    }
}

function getHeightMap(tileX, tileY, heightMap) {
    var canvas = tiles.renderCanvas,
	ctx = tiles.renderCtx;
    ctx.clearRect(0, 0, tiles.tileSize, tiles.tileSize);

    renderTile(heightMap, true, false);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    tiles.tileMap[tileY][tileX] = {rendered: true,
				   imageData: imageData};
}

function receiveHeightMap(e) {
    var data = e.data;
    getHeightMap(data.tileX, data.tileY, data.heightMap);
}

function getTile(tileX, tileY) {
    tiles.tileMap[tileY] = tiles.tileMap[tileY] || [];

    if (!(tileX in tiles.tileMap[tileY])) {
        if (tiles.postedInFrame < 1) {
            tiles.postedInFrame++;
            tiles.worker.postMessage({tileX: tileX,
                                      tileY: tileY,
                                      tileSize: tiles.tileSize});
	    tiles.tileMap[tileY][tileX] = {rendered: false};
        } else {
            return {rendered: false};
        }
    }
    return tiles.tileMap[tileY][tileX];
}

function update() {
    tiles.ticks++;
}

function render() {
    var i;
    var tile;
    var canvas = tiles.canvas,
        ctx = tiles.ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    tiles.postedInFrame = 0;
    var x, y;
    for (y = 0; y < canvas.height - tiles.tileSize + 1; y += tiles.tileSize) {
	for (x = 0; x < canvas.width - tiles.tileSize + 1; x += tiles.tileSize) {
	    var tileX = ((x - tiles.offsetX) / tiles.tileSize) | 0,
		tileY = ((y - tiles.offsetY) / tiles.tileSize) | 0;
	    var tile = getTile(tileX, tileY);
	    if (tile.rendered) {
		ctx.putImageData(tile.imageData,
				 tileX * tiles.tileSize + tiles.offsetX,
				 tileY * tiles.tileSize + tiles.offsetY
				);
	    }
        }
    }

    ctx.strokeText("Ticks: " + tiles.ticks, 10, 10);
}

function loop() {
    requestAnimationFrame(loop);
    update();
    render();
}

function start(canvasId) {
    tiles.worker = new Worker("heightmap-worker.js");
    tiles.worker.onmessage = receiveHeightMap;

    tiles.canvas = document.getElementById(canvasId),
    tiles.canvas.width = window.innerWidth;
    tiles.canvas.height = window.innerHeight;
    tiles.ctx = tiles.canvas.getContext("2d");

    tiles.renderCanvas = document.createElement("canvas");
    tiles.renderCanvas.width = tiles.tileSize;
    tiles.renderCanvas.height = tiles.tileSize;
    tiles.renderCtx = tiles.renderCanvas.getContext("2d");

    requestAnimationFrame(loop);
}

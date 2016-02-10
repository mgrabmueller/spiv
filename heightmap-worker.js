importScripts("perlin.js");

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

function renderTile(heightMap, tileSize, doColor, lighting) {
    var buffer = new Uint8ClampedArray(tileSize * tileSize * 4);
    var x, y;
    var shadowVal = 30;
    var lift = 0.2
    var idx = 0;
    for (y = 1; y < tileSize+1; y++) {
	for (x = 1; x < tileSize+1; x++) {
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
	    buffer[idx+0] = r;
	    buffer[idx+1] = g;
	    buffer[idx+2] = b;
	    buffer[idx+3] = 255;
	    idx += 4;
	}
    }
    return buffer;
}

function genHeightMap(tileX, tileY, tileSize, scale) {
    var heightMap = [];
    for (var ay = 0; ay < tileSize+1; ay++) {
	for (var ax = 0; ax < tileSize+1; ax++) {
            var x = (tileX * tileSize + ax)/scale,
                y = (tileY * tileSize + ay)/scale;
	    var sum = 0;

	    var c = 2;
	    while (c <= 512) {
		sum += noise.simplex2(x/c, y/c);
		sum /= 2;
		c *= 2;
	    }
	    sum += 0.0;
	    sum = Math.max(-1, Math.min(1, sum));
	    heightMap[ay] = heightMap[ay] || [];
	    heightMap[ay][ax] = sum;
	}
    }
    return heightMap;
}

onmessage = function(e) {
    var data = e.data;
    var heightMap = genHeightMap(data.tileX, data.tileY, data.tileSize, data.scale);
    var buffer = renderTile(heightMap, data.tileSize, data.color, data.lighting);
    postMessage({tileX: data.tileX, tileY: data.tileY, scaleIndex: data.scaleIndex, buffer: buffer, color: data.color, lighting: data.lighting})
}

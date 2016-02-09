importScripts("perlin.js");

function genHeightMap(tileX, tileY, tileSize) {
    var heightMap = [];
    for (var ay = 0; ay < tileSize; ay++) {
	for (var ax = 0; ax < tileSize; ax++) {
            var x = tileX * tileSize + ax,
                y = tileY * tileSize + ay;
	    var sum = 0;

	    var c = tileSize/8;
	    while (c <= tileSize*4) {
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
    var heightMap = genHeightMap(data.tileX, data.tileY, data.tileSize);
    postMessage({tileX: data.tileX, tileY: data.tileY, heightMap: heightMap})
}

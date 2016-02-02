var oceanLevel = 0.0;

var colors =
    [
	{low: -1.0000, r:   0, g:   0, b: 128}, 
	{low: -0.2500, r:   0, g:   0, b: 255}, 
	{low: oceanLevel, r:   0, g: 128, b: 255}, 
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

function render(canvas, heightMap, lighting) {
    var ctx = canvas.getContext('2d');
    var x, y;
    var shadowVal = 30;
    for (y = 0; y < canvas.height; y++) {
	for (x = 0; x < canvas.width; x++) {
	    var color = interpolateColor(heightMap[y][x]),
		r = color[0],
		g = color[1],
		b = color[2];

	    if (lighting && heightMap[y][x] > oceanLevel && x > 0) {
		if (heightMap[y][x-1] > heightMap[y][x]) {
		    r = Math.max(0, r - shadowVal);
		    g = Math.max(0, g - shadowVal);
		    b = Math.max(0, b - shadowVal);
		}
	    }
	    if (lighting && heightMap[y][x] > oceanLevel && y > 0) {
		if (heightMap[y-1][x] > heightMap[y][x]) {
		    r = Math.max(0, r - shadowVal);
		    g = Math.max(0, g - shadowVal);
		    b = Math.max(0, b - shadowVal);
		}
	    }
	    if (lighting && heightMap[y][x] > oceanLevel && x > 0 && y > 0) {
		if (heightMap[y-1][x-1] > heightMap[y][x]) {
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

function start(canvasId1, canvasId2) {
    var canvas1 = document.getElementById(canvasId1);
    var canvas2 = document.getElementById(canvasId2);

    var heightMap = [];
    
    noise.seed(4711);

    canvas1.style.width = '512px';
    canvas1.style.height = '512px';
    canvas2.style.width = '512px';
    canvas2.style.height = '512px';
    var x, y;
    console.log('calculating...');
    for (y = 0; y < canvas1.height; y++) {
	for (x = 0; x < canvas1.width; x++) {
	    var sum = 0;
	    
	    var c = 4;
	    while (c <= canvas1.height) {
		sum += noise.simplex2(x/c, y/c);
		sum /= 2;
		c *= 2;
	    }
	    sum += 0.0;
	    sum = Math.max(-1, Math.min(1, sum));
	    heightMap[y] = heightMap[y] || {};
	    heightMap[y][x] = sum;
	}
    }
    console.log('calculating... done.');
    render(canvas1, heightMap, true);
    render(canvas2, heightMap, false);
}

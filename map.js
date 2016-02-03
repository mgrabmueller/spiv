var oceanLevel = 0.0;

var VERY_DRY = 0,
    DRY = 1,
    MODERATE = 2,
    WET = 3,
    VERY_WET = 4;

var colorMaps =
    [
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
	],
	[
	    {low: -1.0000, r:   0, g:   0, b: 128}, 
	    {low: -0.2500, r:   0, g:   0, b: 255}, 
	    {low: oceanLevel, r:   0, g: 128, b: 255}, 
	    {low:  0.0600, r: 240, g: 240, b:  64}, 
	    {low:  0.1150, r:  32, g: 160, b:   0}, 
	    {low:  0.3050, r: 220, g: 240, b:   0}, 
	    {low:  0.6500, r: 128, g: 128, b: 128}, 
	    {low:  0.7500, r: 240, g: 240, b: 240}, 
	    {low:  0.9500, r: 255, g: 255, b: 255}, 
	],
	[
	    {low: -1.0000, r:   0, g:   0, b: 128}, 
	    {low: -0.2500, r:   0, g:   0, b: 255}, 
	    {low: oceanLevel, r:   0, g: 128, b: 255}, 
	    {low:  0.0525, r: 240, g: 240, b:  64}, 
	    {low:  0.1050, r:  32, g: 160, b:   0}, 
	    {low:  0.2250, r: 204, g: 224, b:   0}, 
	    {low:  0.6000, r: 150, g: 128, b: 150}, 
	    {low:  0.7000, r: 240, g: 240, b: 240}, 
	    {low:  0.9000, r: 255, g: 255, b: 255}, 
	],
	[
	    {low: -1.0000, r:   0, g:   0, b: 128}, 
	    {low: -0.2500, r:   0, g:   0, b: 255}, 
	    {low: oceanLevel, r:   0, g: 128, b: 255}, 
	    {low:  0.0625, r: 240, g: 240, b:  64}, 
	    {low:  0.1250, r:  32, g: 160, b:   0}, 
	    {low:  0.2750, r: 184, g: 204, b:   0}, 
	    {low:  0.6000, r: 170, g: 170, b: 170}, 
	    {low:  0.7500, r: 240, g: 240, b: 240}, 
	    {low:  0.8500, r: 255, g: 255, b: 255}, 
	],
	[
	    {low: -1.0000, r:   0, g:   0, b: 128}, 
	    {low: -0.2500, r:   0, g:   0, b: 255}, 
	    {low: oceanLevel, r:   0, g: 128, b: 255}, 
	    {low:  0.0625, r: 240, g: 240, b:  64}, 
	    {low:  0.1250, r:  32, g: 160, b:   0}, 
	    {low:  0.3050, r: 164, g: 184, b:   0}, 
	    {low:  0.5500, r: 180, g: 180, b: 180}, 
	    {low:  0.7000, r: 245, g: 240, b: 245}, 
	    {low:  0.8000, r: 255, g: 255, b: 255}, 
	]
    ];

function classifyMoisture(moisture) {
    if (moisture > 0.6) {
	return VERY_WET;
    } else if (moisture > 0.2) {
	return WET;
    } else if (moisture > -0.2) {
	return MODERATE;
    } else if (moisture > -0.6) {
	return DRY;
    } else {
	return VERY_DRY;
    }
}

function interpolateColor(value, x, y, moistureMap) {
    var colors = moistureMap ? colorMaps[classifyMoisture(moistureMap[y][x])] : colorMaps[MODERATE];
    var i;
    var loIdx, hiIdx = colors.length - 1;
    for (i in colors) {
	if (value < colors[i].low) {
	    hiIdx = i;
	    break;
	}
	loIdx = i;
    }
    var t = ((value - colors[loIdx].low) / (colors[hiIdx].low - colors[loIdx].low));//*4/5;
    var r = Math.floor(t * (colors[hiIdx].r - colors[loIdx].r) + colors[loIdx].r),
	g = Math.floor(t * (colors[hiIdx].g - colors[loIdx].g) + colors[loIdx].g),
	b = Math.floor(t * (colors[hiIdx].b - colors[loIdx].b) + colors[loIdx].b);

    return [r, g, b];
}

function render(canvas, heightMap, doColor, lighting, moistureMap) {
    var ctx = canvas.getContext('2d');
    var x, y;
    var shadowVal = 30;
    for (y = 0; y < canvas.height; y++) {
	for (x = 0; x < canvas.width; x++) {
	    var gray = Math.floor(((heightMap[y][x] + 1) / 2) * 255);
	    var color = doColor ? interpolateColor(heightMap[y][x], x, y, moistureMap) : [gray, gray, gray],
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

function start(canvasId1, canvasId2, canvasId3, canvasId4) {
    var canvas1 = document.getElementById(canvasId1);
    var canvas2 = document.getElementById(canvasId2);
    var canvas3 = document.getElementById(canvasId3);
    var canvas4 = document.getElementById(canvasId4);

    var heightMap = [];
    var moistureMap = [];
    
    noise.seed((+new Date()) % 65536);

    var sz = '256px';
    canvas1.style.width = sz;
    canvas1.style.height = sz;
    canvas2.style.width = sz
    canvas2.style.height = sz
    canvas3.style.width = sz
    canvas3.style.height = sz
    canvas4.style.width = sz
    canvas4.style.height = sz
    canvas5.style.width = sz
    canvas5.style.height = sz
    canvas6.style.width = sz
    canvas6.style.height = sz
    var x, y;
    console.log('calculating...');
    for (y = 0; y < canvas1.height; y++) {
	for (x = 0; x < canvas1.width; x++) {
	    var sum = 0;
	    
	    var c = 4;
	    while (c <= canvas1.height*2) {
		sum += noise.simplex2(x/c, y/c);
		sum /= 2;
		c *= 2;
	    }
	    sum += 0.0;
	    sum = Math.max(-1, Math.min(1, sum));
	    heightMap[y] = heightMap[y] || [];
	    heightMap[y][x] = sum;
	}
    }
    noise.seed(353647);

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
	    moistureMap[y] = moistureMap[y] || [];
	    moistureMap[y][x] = sum;
	}
    }
    console.log('calculating... done.');
    render(canvas1, heightMap, false, false);
    render(canvas2, heightMap, false, true);
    render(canvas3, heightMap, true, false);
    render(canvas4, heightMap, true, true);
    render(canvas5, heightMap, true, true, moistureMap);
    render(canvas6, moistureMap, false, false);
}

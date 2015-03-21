// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />

var colors = ['lightsalmon', 'lightseagreen', 'aquamarine', 'beige', 'burlywood', 'mistyrose', 'mediumpurple', 'darkcyan', 'darkgray', 'orchid', 'peru', 'dodgerblue'];
var N = 1000;
var distMin = 10;

$(document).ready(function () {
	initEvents($("#myCanvas"));
});

// キャンバスにイベントを紐付ける関数
function initEvents(canvas) {

	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();

	var inputPoints = [];	// 入力頂点
	var points = [];	// 頂点の座標群
	var head = [];	// DelaunayTriangleクラスのインスタンス配列
	var holeBoundary = [];	// 穴の境界
	var boundaryPoints = [];
	var holeBoundaryPoints = [];

	var selectPoint = null;

	function circle(center) {
		var inputPoints = [];
		var r = 0.06 * canvasHeight;
		var thDiv = 20;
		var th;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		return { points: inputPoints};
	}


	function waveCircle(center) {
		var inputPoints = [];
		var rad = 0.3 * canvasHeight;
		var innerRad = 0.1 * rad;
		var thDiv = 150;
		var numWave = 20;
		var th;
		var r;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			r = rad + innerRad * Math.sin(numWave * th);
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		return { points: inputPoints };
	}

	function makeInputData() {
		var center0 = [canvasWidth * 0.5, canvasHeight * 0.5];
		var center_up = [canvasWidth * 0.5, canvasHeight * 0.5 + canvasWidth * 0.1];
		var center_bottom = [canvasWidth * 0.5, canvasHeight * 0.5 - canvasWidth * 0.1];
		var center_left = [canvasWidth * 0.4, canvasHeight * 0.5];
		var center_right = [canvasWidth * 0.6, canvasHeight * 0.5];
		var waveResult = waveCircle(center0);
		inputPoints = waveResult.points;
		boundaryPoints = [waveResult.points];

		// duplicated points
		boundaryPoints = [[[100, 100], [100, 150], [100, 200], [200, 200], [200, 150], [100, 150], [200, 100]]];
		return;

		// 北海道
		/*
		boundaryPoints = [[[103, 5], [102, 6], [101, 7], [100, 8], [100, 9], [100, 10], [99, 11], [98, 11], [97, 11], [96, 11], [95, 11], [94, 11], [93, 11], [92, 11], [91, 12], [91, 13], [91, 14], [91, 15], [91, 16], [91, 17], [90, 18], [89, 19], [89, 20], [89, 21], [88, 22], [87, 23], [87, 24], [87, 25], [87, 26], [87, 27], [87, 28], [87, 29], [87, 30], [87, 31], [88, 32], [89, 33], [89, 34], [89, 35], [89, 36], [89, 37], [89, 38], [90, 39], [91, 40], [91, 41], [92, 42], [92, 43], [92, 44], [93, 45], [94, 46], [94, 47], [94, 48], [94, 49], [95, 50], [95, 51], [95, 52], [95, 53], [95, 54], [95, 55], [95, 56], [95, 57], [95, 58], [95, 59], [95, 60], [95, 61], [95, 62], [96, 63], [97, 64], [97, 65], [97, 66], [97, 67], [97, 68], [98, 69], [99, 70], [99, 71], [99, 72], [99, 73], [99, 74], [99, 75], [99, 76], [98, 77], [97, 78], [97, 79], [97, 80], [97, 81], [96, 82], [95, 83], [95, 84], [95, 85], [94, 86], [94, 87], [94, 88], [94, 89], [94, 90], [94, 91], [94, 92], [94, 93], [94, 94], [94, 95], [94, 96], [94, 97], [94, 98], [94, 99], [94, 100], [94, 101], [94, 102], [94, 103], [94, 104], [94, 105], [94, 106], [94, 107], [94, 108], [94, 109], [94, 110], [94, 111], [94, 112], [94, 113], [94, 114], [94, 115], [94, 116], [93, 117], [92, 118], [91, 119], [90, 120], [89, 120], [88, 120], [87, 120], [86, 121], [85, 122], [84, 123], [83, 124], [82, 125], [81, 126], [81, 127], [81, 128], [81, 129], [81, 130], [81, 131], [81, 132], [81, 133], [81, 134], [82, 135], [82, 136], [82, 137], [82, 138], [82, 139], [82, 140], [82, 141], [81, 142], [81, 143], [81, 144], [81, 145], [81, 146], [81, 147], [82, 148], [82, 149], [83, 150], [84, 151], [84, 152], [84, 153], [84, 154], [84, 155], [84, 156], [83, 157], [82, 158], [82, 159], [82, 160], [82, 161], [81, 162], [81, 163], [81, 164], [80, 165], [79, 166], [78, 166], [77, 166], [76, 167], [75, 167], [74, 167], [73, 168], [72, 169], [71, 169], [70, 168], [69, 167], [68, 166], [67, 166], [66, 166], [65, 166], [64, 166], [63, 166], [62, 166], [61, 166], [60, 166], [59, 166], [58, 166], [57, 167], [56, 167], [55, 167], [54, 166], [53, 166], [52, 165], [51, 164], [50, 164], [49, 164], [48, 163], [47, 162], [46, 161], [45, 160], [44, 159], [43, 158], [42, 158], [41, 157], [40, 157], [39, 157], [38, 157], [37, 157], [36, 157], [35, 157], [34, 158], [33, 158], [32, 159], [32, 160], [32, 161], [31, 162], [31, 163], [31, 164], [31, 165], [30, 166], [30, 167], [30, 168], [30, 169], [30, 170], [31, 171], [31, 172], [32, 173], [33, 173], [34, 174], [34, 175], [34, 176], [35, 177], [36, 178], [37, 179], [38, 180], [39, 181], [39, 182], [39, 183], [38, 184], [37, 185], [36, 186], [35, 187], [34, 187], [33, 187], [32, 188], [31, 189], [30, 190], [29, 191], [29, 192], [29, 193], [28, 194], [27, 195], [26, 196], [25, 196], [24, 196], [23, 196], [22, 197], [21, 198], [20, 199], [19, 200], [18, 201], [17, 202], [16, 203], [15, 203], [14, 203], [13, 204], [12, 205], [11, 206], [10, 206], [9, 207], [8, 208], [7, 209], [6, 209], [5, 210], [5, 211], [5, 212], [5, 213], [5, 214], [5, 215], [5, 216], [5, 217], [5, 218], [5, 219], [5, 220], [5, 221], [5, 222], [5, 223], [5, 224], [5, 225], [5, 226], [5, 227], [5, 228], [5, 229], [5, 230], [5, 231], [5, 232], [5, 233], [5, 234], [5, 235], [5, 236], [5, 237], [5, 238], [6, 239], [7, 240], [8, 241], [9, 241], [10, 241], [11, 242], [11, 243], [11, 244], [12, 245], [13, 246], [14, 247], [15, 247], [16, 248], [17, 249], [18, 250], [19, 251], [20, 251], [21, 252], [21, 253], [21, 254], [21, 255], [21, 256], [22, 257], [22, 258], [22, 259], [22, 260], [22, 261], [22, 262], [21, 263], [21, 264], [21, 265], [20, 266], [19, 266], [18, 267], [18, 268], [18, 269], [17, 270], [16, 271], [15, 272], [14, 273], [14, 274], [14, 275], [14, 276], [14, 277], [14, 278], [14, 279], [14, 280], [14, 281], [14, 282], [14, 283], [14, 284], [14, 285], [14, 286], [15, 287], [16, 288], [16, 289], [16, 290], [17, 291], [18, 292], [18, 293], [19, 294], [20, 294], [21, 294], [22, 294], [23, 294], [24, 294], [25, 294], [26, 294], [27, 294], [28, 294], [29, 294], [30, 294], [31, 293], [32, 293], [33, 292], [34, 291], [35, 290], [36, 289], [37, 288], [38, 288], [39, 288], [40, 287], [41, 286], [41, 285], [41, 284], [41, 283], [41, 282], [41, 281], [41, 280], [41, 279], [42, 278], [42, 277], [43, 276], [44, 275], [45, 275], [46, 274], [47, 273], [47, 272], [48, 271], [49, 270], [50, 269], [51, 269], [52, 269], [53, 270], [54, 270], [55, 270], [56, 270], [57, 271], [58, 272], [59, 272], [60, 272], [61, 272], [62, 273], [63, 273], [64, 273], [65, 273], [66, 273], [67, 273], [68, 273], [69, 273], [70, 273], [71, 272], [72, 272], [73, 272], [74, 271], [75, 270], [76, 270], [77, 270], [78, 269], [79, 268], [80, 267], [80, 266], [80, 265], [80, 264], [80, 263], [79, 262], [78, 261], [77, 260], [76, 259], [75, 258], [74, 258], [73, 257], [72, 257], [71, 257], [70, 257], [69, 256], [68, 255], [67, 254], [67, 253], [67, 252], [67, 251], [67, 250], [66, 249], [65, 248], [64, 248], [63, 247], [62, 247], [61, 246], [60, 245], [59, 244], [58, 243], [57, 242], [56, 241], [55, 241], [54, 240], [53, 240], [52, 240], [51, 240], [50, 240], [49, 240], [48, 240], [47, 240], [46, 240], [45, 240], [44, 239], [43, 238], [42, 237], [41, 237], [40, 236], [39, 236], [38, 236], [37, 235], [36, 234], [35, 234], [34, 233], [33, 232], [32, 231], [32, 230], [32, 229], [32, 228], [32, 227], [33, 226], [34, 225], [34, 224], [34, 223], [35, 222], [36, 221], [36, 220], [36, 219], [37, 218], [38, 218], [39, 217], [40, 216], [41, 215], [42, 215], [43, 215], [44, 215], [45, 215], [46, 215], [47, 215], [48, 215], [49, 215], [50, 215], [51, 215], [52, 215], [53, 216], [54, 217], [55, 218], [56, 219], [57, 220], [58, 221], [59, 222], [60, 223], [61, 224], [62, 225], [62, 226], [61, 227], [61, 228], [61, 229], [61, 230], [61, 231], [62, 232], [63, 233], [64, 233], [65, 233], [66, 233], [67, 233], [68, 233], [69, 232], [70, 231], [71, 230], [72, 229], [73, 228], [74, 227], [75, 226], [76, 225], [77, 224], [78, 223], [79, 222], [80, 221], [81, 220], [82, 220], [83, 220], [84, 219], [85, 218], [86, 217], [87, 216], [88, 216], [89, 215], [90, 215], [91, 215], [92, 214], [93, 213], [94, 213], [95, 213], [96, 213], [97, 212], [98, 212], [99, 211], [100, 211], [101, 211], [102, 211], [103, 211], [104, 211], [105, 211], [106, 212], [107, 212], [108, 213], [109, 213], [110, 213], [111, 214], [112, 215], [113, 216], [114, 216], [115, 217], [116, 218], [117, 218], [118, 218], [119, 218], [120, 218], [121, 219], [122, 220], [123, 220], [124, 221], [125, 222], [126, 223], [127, 224], [128, 225], [129, 226], [130, 227], [131, 228], [132, 229], [133, 229], [134, 229], [135, 230], [136, 231], [137, 231], [138, 231], [139, 231], [140, 231], [141, 231], [142, 232], [143, 233], [144, 233], [145, 234], [146, 235], [147, 236], [148, 236], [149, 236], [150, 237], [151, 238], [152, 238], [153, 238], [154, 238], [155, 239], [156, 239], [157, 239], [158, 240], [159, 241], [160, 241], [161, 241], [162, 241], [163, 241], [164, 241], [165, 241], [166, 242], [167, 242], [168, 242], [169, 243], [170, 244], [171, 245], [172, 246], [173, 246], [174, 247], [175, 248], [176, 249], [177, 249], [178, 249], [179, 249], [180, 249], [181, 248], [182, 247], [183, 246], [183, 245], [183, 244], [184, 243], [185, 242], [185, 241], [185, 240], [185, 239], [186, 238], [187, 237], [187, 236], [187, 235], [187, 234], [187, 233], [187, 232], [187, 231], [187, 230], [187, 229], [187, 228], [187, 227], [187, 226], [187, 225], [187, 224], [187, 223], [188, 222], [188, 221], [188, 220], [189, 219], [190, 218], [190, 217], [190, 216], [191, 215], [192, 214], [193, 213], [193, 212], [194, 211], [195, 210], [195, 209], [195, 208], [196, 207], [197, 206], [198, 205], [198, 204], [199, 203], [200, 202], [200, 201], [201, 200], [201, 199], [202, 198], [203, 197], [204, 196], [205, 195], [206, 194], [207, 193], [208, 192], [209, 191], [210, 190], [211, 189], [212, 188], [213, 187], [214, 187], [215, 187], [216, 186], [216, 185], [217, 184], [218, 183], [219, 182], [220, 182], [221, 181], [222, 181], [223, 180], [224, 179], [225, 178], [226, 177], [227, 177], [228, 177], [229, 177], [230, 177], [231, 177], [232, 177], [233, 177], [234, 177], [235, 177], [236, 177], [237, 178], [238, 179], [239, 179], [240, 179], [241, 179], [242, 179], [243, 179], [244, 179], [245, 179], [246, 179], [247, 179], [248, 179], [249, 178], [250, 177], [250, 176], [250, 175], [250, 174], [251, 173], [252, 172], [253, 172], [254, 172], [255, 173], [256, 174], [257, 174], [258, 174], [259, 174], [260, 174], [261, 174], [262, 173], [263, 173], [264, 172], [265, 171], [266, 171], [267, 170], [268, 169], [268, 168], [268, 167], [268, 166], [268, 165], [269, 164], [270, 164], [271, 163], [272, 163], [273, 163], [274, 163], [275, 162], [276, 161], [276, 160], [277, 159], [278, 159], [279, 159], [280, 159], [281, 159], [282, 158], [283, 158], [284, 158], [285, 157], [286, 156], [286, 155], [286, 154], [287, 153], [288, 152], [289, 151], [290, 150], [290, 149], [290, 148], [290, 147], [290, 146], [289, 145], [288, 145], [287, 145], [286, 145], [285, 145], [284, 145], [283, 145], [282, 146], [281, 147], [280, 148], [279, 148], [278, 148], [277, 148], [276, 149], [275, 149], [274, 148], [274, 147], [274, 146], [274, 145], [274, 144], [273, 143], [273, 142], [273, 141], [273, 140], [273, 139], [273, 138], [273, 137], [272, 136], [271, 135], [271, 134], [272, 133], [273, 132], [273, 131], [273, 130], [273, 129], [273, 128], [272, 127], [271, 126], [270, 126], [269, 126], [268, 126], [267, 126], [266, 125], [265, 124], [264, 123], [263, 122], [263, 121], [263, 120], [263, 119], [263, 118], [263, 117], [263, 116], [263, 115], [263, 114], [263, 113], [263, 112], [263, 111], [264, 110], [264, 109], [265, 108], [265, 107], [266, 106], [266, 105], [266, 104], [266, 103], [267, 102], [268, 101], [268, 100], [268, 99], [269, 98], [269, 97], [269, 96], [269, 95], [269, 94], [270, 93], [270, 92], [271, 91], [272, 90], [272, 89], [272, 88], [272, 87], [272, 86], [272, 85], [272, 84], [272, 83], [272, 82], [272, 81], [271, 80], [270, 80], [269, 80], [268, 80], [267, 80], [266, 81], [266, 82], [266, 83], [265, 84], [265, 85], [265, 86], [264, 87], [263, 88], [262, 89], [261, 90], [260, 91], [259, 92], [259, 93], [258, 94], [257, 94], [256, 95], [255, 96], [254, 97], [254, 98], [253, 99], [252, 99], [251, 100], [250, 101], [250, 102], [249, 103], [248, 104], [247, 104], [246, 105], [245, 106], [244, 107], [243, 108], [242, 109], [241, 109], [240, 110], [239, 110], [238, 110], [237, 109], [236, 109], [235, 109], [234, 109], [233, 108], [232, 107], [231, 107], [230, 107], [229, 107], [228, 106], [227, 105], [226, 104], [226, 103], [226, 102], [225, 101], [224, 100], [223, 99], [222, 99], [221, 99], [220, 99], [219, 99], [218, 100], [217, 100], [216, 99], [215, 99], [214, 99], [213, 98], [212, 97], [211, 97], [210, 96], [209, 96], [208, 96], [207, 96], [206, 96], [205, 96], [204, 96], [203, 97], [202, 97], [201, 97], [200, 97], [199, 96], [198, 95], [198, 94], [198, 93], [197, 92], [196, 91], [195, 91], [194, 90], [193, 89], [192, 89], [191, 89], [190, 88], [189, 87], [188, 87], [187, 86], [186, 85], [185, 84], [184, 84], [183, 84], [182, 83], [181, 83], [180, 83], [179, 83], [178, 82], [177, 81], [176, 80], [175, 79], [174, 78], [173, 77], [172, 76], [171, 75], [170, 75], [169, 74], [168, 74], [167, 73], [167, 72], [166, 71], [165, 71], [164, 70], [163, 70], [162, 69], [161, 68], [160, 67], [159, 66], [158, 65], [157, 64], [156, 63], [156, 62], [156, 61], [155, 60], [154, 59], [153, 58], [152, 57], [151, 56], [150, 55], [149, 54], [149, 53], [148, 52], [147, 51], [146, 50], [145, 49], [144, 48], [144, 47], [144, 46], [143, 45], [142, 44], [141, 43], [140, 42], [139, 41], [138, 40], [138, 39], [137, 38], [136, 37], [136, 36], [135, 35], [134, 35], [133, 34], [132, 33], [131, 32], [130, 31], [129, 30], [128, 29], [127, 28], [126, 27], [125, 26], [124, 25], [123, 24], [123, 23], [122, 22], [121, 21], [120, 21], [119, 20], [118, 19], [117, 18], [117, 17], [117, 16], [116, 15], [115, 14], [114, 13], [113, 12], [112, 11], [111, 10], [110, 9], [110, 8], [110, 7], [109, 6], [108, 5], [107, 5], [106, 5], [105, 5], [104, 5], ], ];
		for(var i = 0; i < boundaryPoints.length; ++i) {
			for(var j = 0; j < boundaryPoints[i].length; ++j) {
				boundaryPoints[i][j][0] *= 2;
				boundaryPoints[i][j][1] *= 2;
			}
		}
		return;
		*/


		holeBoundaryPoints = [];
		var circleResult = circle(center0);
		holeBoundaryPoints.push(circleResult.points);
		return;
		var circleResult = circle(center_up);
		holeBoundaryPoints.push(circleResult.points);
		circleResult = circle(center_bottom);
		holeBoundaryPoints.push(circleResult.points);
		circleResult = circle(center_left);
		holeBoundaryPoints.push(circleResult.points);
		circleResult = circle(center_right);
		holeBoundaryPoints.push(circleResult.points);

	}

	makeInputData();

	draw();

	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 右クリック
		if(event.button == 2 || event.button == 0) {
			var canvasOffset = canvas.offset();
			var canvasX = Math.floor(event.pageX - canvasOffset.left);
			var canvasY = Math.floor(event.pageY - canvasOffset.top);
			if(canvasX < 0 || canvasX > canvasWidth) {
				return;
			}
			if(canvasY < 0 || canvasY > canvasHeight) {
				return;
			}
			var clickPos = [canvasX, canvasY];
			var dist;
			for(var i = 0; i < inputPoints.length; ++i) {
				dist = util.norm2(util.sub(inputPoints[i], clickPos));
				if(dist < 10) {
					selectPoint = i;
					break;
				}
			}
		}
	});
	// mouse移動時のイベントコールバック設定
	canvas.mousemove(function (event) {
		var canvasOffset = canvas.offset();
		var canvasX = Math.floor(event.pageX - canvasOffset.left);
		var canvasY = Math.floor(event.pageY - canvasOffset.top);
		if(canvasX < 0 || canvasX > canvasWidth) {
			return;
		}
		if(canvasY < 0 || canvasY > canvasHeight) {
			return;
		}
		if(selectPoint != null) {
			inputPoints[selectPoint] = [canvasX, canvasY];
			draw();
		}
	});
	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup(function (event) {
		selectPoint = null;
		draw();
	});

	$("input").click(function () {
		draw()
	});

	// リセットボタン
	$("#reset").click(function () {
		inputPoints = [];
		points = [];
		head = [];
		selectPoint = null;

		makeInputData();

		draw();
	});

	// 点群の生成と三角形分割
	// レンダリングのリフレッシュを行う関数
	function draw() {

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		//console.log(""+inputPoints);

		// 三角形分割
		if(true) {
			var option = { triSize: 0, merge : true }
			var result = cdt(boundaryPoints, holeBoundaryPoints, option);
			drawResult(result, context, holeBoundary, inputPoints);
		}


	}

	function drawResult(result, context, holeBoundary, inputPoints) {
		if(result == null) {
			// 点の描画
			context.fillStyle = 'black';
			drawPoints(canvas, inputPoints, 3);
			return;
		}
		points = result.points;
		conn = result.connectivity;


		// 三角形の描画
		context.strokeStyle = 'black';
		context.fillStyle = 'lightblue';
		for(var i = 0; i < conn.length; ++i) {
			context.beginPath();
			context.moveTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.lineTo(points[conn[i][1]][0], points[conn[i][1]][1]);
			context.lineTo(points[conn[i][2]][0], points[conn[i][2]][1]);
			context.lineTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.stroke();
			context.fill();
		}


		// 境界の描画
		/*
		context.strokeStyle = 'lightgreen';
		context.lineWidth = 6;
		context.beginPath();
		for(var j = 0; j < boundaryPoints.length; ++j) {
			if(boundaryPoints[j].length != 0) {
				context.moveTo(boundaryPoints[j][0][0], boundaryPoints[j][0][1]);
			}
			for(var i = 1; i < boundaryPoints[j].length; ++i) {
				context.lineTo(boundaryPoints[j][i][0], boundaryPoints[j][i][1]);
			}
			context.lineTo(boundaryPoints[j][0][0], boundaryPoints[j][0][1]);
			context.stroke();
		}
		context.lineWidth = 1;

		// 穴境界の描画
		context.strokeStyle = 'lightblue';
		context.lineWidth = 6;
		context.beginPath();
		for(var j = 0; j < holeBoundaryPoints.length; ++j) {
			if(holeBoundaryPoints[j].length != 0) {
				context.moveTo(holeBoundaryPoints[j][0][0], holeBoundaryPoints[j][0][1]);
			}
			for(var i = 1; i < holeBoundaryPoints[j].length; ++i) {
				context.lineTo(holeBoundaryPoints[j][i][0], holeBoundaryPoints[j][i][1]);
			}
			context.lineTo(holeBoundaryPoints[j][0][0], holeBoundaryPoints[j][0][1]);
			context.stroke();
		}
		context.lineWidth = 1;
		*/
		
		// 点の描画
		context.fillStyle = 'black';
		drawPoints(canvas, points, 2);
	}
}


// 以下、描画関係


function drawPoints(canvas, points, rad) {
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var i = 0; i < points.length; ++i) {
		context.beginPath();
		context.arc(points[i][0], points[i][1], rad, 0, 2 * Math.PI, true);
		context.fill();
	}
}

function drawTrianglesFromHead(canvas, points, head) {
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var tri = head; tri != null; tri = tri.next) {
		context.beginPath();
		context.moveTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.lineTo(points[tri.vertexID[1]][0], points[tri.vertexID[1]][1]);
		context.lineTo(points[tri.vertexID[2]][0], points[tri.vertexID[2]][1]);
		context.lineTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.stroke();
		context.fill();
	}
}


function fillTrianglesFromHead(canvas, points, head) {
	var context = canvas.get(0).getContext("2d");
	var canvasWidth = canvas.width();
	var canvasHeight = canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	var i = 0;
	for(var tri = head; tri != null; tri = tri.next) {
		context.fillStyle = colors[i % colors.length];
		context.beginPath();
		context.moveTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.lineTo(points[tri.vertexID[1]][0], points[tri.vertexID[1]][1]);
		context.lineTo(points[tri.vertexID[2]][0], points[tri.vertexID[2]][1]);
		context.lineTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.fill();
		++i;
	}
}


// 三角形の外接円を描画
function drawCircumcirclesFromHead(canvas, points, head) {
	var context = canvas.get(0).getContext("2d");
	var cir;
	var i = 0;
	context.globalAlpha = 0.3;
	for(var tri = head; tri != null; tri = tri.next) {
		context.fillStyle = colors[i % colors.length];
		context.beginPath();
		cir = new DelaunayTriangle.Circumcircle(points[tri.vertexID[0]], points[tri.vertexID[1]], points[tri.vertexID[2]]);
		context.arc(cir.p[0], cir.p[1], cir.rad, 0, Math.PI * 2, true);
		context.fill();
		++i;
	}
	context.globalAlpha = 1.0;
}



function drawAdjacents(canvas, points, head) {
	var context = canvas.get(0).getContext("2d");
	var v1 = [];
	var v2 = [];
	var v12 = [];
	var edgeMid = [];
	for(var tri = head; tri != null; tri = tri.next) {
		if(tri.isRemoved) {
			console.log("removed が　混じってるぞ");
			continue;
		}
		context.strokeStyle = 'orange';
		//context.strokeStyle = 'blue';
		v1 = util.add(points[tri.vertexID[0]], points[tri.vertexID[1]]);
		v1 = util.div(util.add(v1, points[tri.vertexID[2]]), 3);
		for(var j = 0; j < 3; ++j) {
			if(tri.adjacent[j] == null) {
				continue;
			}
			if(tri.adjacent[j].adjacent[tri.edgeIDinAdjacent[j]]!==tri){
				continue;
			}

			// ボロノイ図的な図の描画のため
			v2 = util.add(points[tri.adjacent[j].vertexID[0]], points[tri.adjacent[j].vertexID[1]]);
			v2 = util.div(util.add(v2, points[tri.adjacent[j].vertexID[2]]), 3);
			v12 = util.sub(v2, v1);
			v12 = util.mul(0.48, v12);
			edgeMid = util.add(v1, v12);

			// 隣接三角形の辺の中点
			/*
			edgeMid = util.add(points[tri.adjacent[j].vertexID[tri.edgeIDinAdjacent[j]]], points[tri.adjacent[j].vertexID[(tri.edgeIDinAdjacent[j] + 1) % 3]]);
			edgeMid = util.mul(edgeMid, 0.5);
			*/

			context.beginPath();
			context.moveTo(v1[0], v1[1]);
			context.lineTo(edgeMid[0], edgeMid[1]);
			context.stroke();
		}
	}
}



// 配列処理

function util() { };


util.clone = function (src) {
	if(src.length == 0) {
		return [];
	}
	var tmp = new Array(src.length);
	if(typeof (src[0]) == 'number') {
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = src[i];
		}
		return tmp;
	}
	if(typeof (src[0][0] == 'number')) {
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = new Array(src[i].length);
			for(var j = 0; j < src[i].length; ++j) {
				tmp[i] = src[i];
			}
		}
		return tmp;
	}
	if(typeof (src[0][0][0] == 'number')) {
		alert('この処理は未検証 at util.clone');
		for(var i = 0; i < src.length; ++i) {
			tmp[i] = new Array(src[i].length);
			for(var j = 0; j < src[i].length; ++j) {
				tmp[i][j] = new Array(src[i][j].length);
				for(var k = 0; k < src[i][j].length; ++k) {
					tmp[i][j][k] = src[i][j][k];
				}
			}
		}
	}
}

util.norm2 = function (src) {
	var tmp = 0;
	for(var i = 0; i < src.length; ++i) {
		tmp += src[i] * src[i];
	}
	return Math.sqrt(tmp);
}

// return x-y
util.sub = function (x, y) {
	if(x.length != y.length) {
		console.log('length of input arrays are not equal. in util.sub');
		return null;
	}
	var l = x.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = x[i] - y[i];
	}
	return tmp;
}


// return x+y
util.add = function (x, y) {
	if(x.length != y.length) {
		console.log('ERROR: length of input arrays are not equal. in util.sub');
		return null;
	}
	var l = x.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = x[i] + y[i];
	}
	return tmp;
}


// return x*y
util.mul = function (x, y) {
	var a;
	var v;
	if(typeof (x) == 'number') {
		a = x;
		v = y;
	} else if(typeof (y) == 'number') {
		a = y;
		v = x;
	} else {
		console.log('ERROR: input argument do not include scalar value');
		return null;
	}
	var l = v.length;
	var tmp = new Array(l);
	for(var i = 0; i < l; ++i) {
		tmp[i] = a * v[i];
	}
	return tmp;
}


// return x/y
util.div = function (x, y) {
	var a;
	var v;
	if(typeof (x) == 'number') {
		a = x;
		v = y;
	} else if(typeof (y) == 'number') {
		a = y;
		v = x;
	} else {
		console.log('ERROR: input arguments do not include scalar value');
		return null;
	}
	var l = v.length;
	var tmp = new Array(l);
	var inva = 1 / a;
	for(var i = 0; i < l; ++i) {
		tmp[i] = v[i] * inva;
	}
	return tmp;
}

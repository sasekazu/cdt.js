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
	var constraint = [];	// 拘束辺

	var selectPoint = null;

	function circle() {
		var inputPoints = [];
		var constraint = [];
		var center = [canvasWidth * 0.5, canvasHeight * 0.5];
		var r = 0.1 * canvasHeight;
		var thDiv = 3;
		var th;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		for(var j = 0; j < inputPoints.length; ++j) {
			constraint.push(j);
		}
		constraint.push(0);
		return { points: inputPoints, constraint: constraint };
	}


	function waveCircle() {
		var inputPoints = [];
		var constraint = [];
		var center = [canvasWidth * 0.5, canvasHeight * 0.5];
		var rad = 0.3 * canvasHeight;
		var innerRad = 0 * rad;
		var thDiv = 6;
		var numWave = 5;
		var th;
		var r;
		for(var i = 0; i < thDiv; ++i) {
			th = 2 * Math.PI / thDiv * i;
			r = rad + innerRad * Math.sin(numWave * th);
			inputPoints.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
		}
		for(var j = 0; j < inputPoints.length; ++j) {
			constraint.push(j);
		}
		constraint.push(0);
		return { points: inputPoints, constraint: constraint };
	}

	var waveResult = waveCircle();
	inputPoints = waveResult.points;
	constraint = [waveResult.constraint];
	
	var circleResult = circle();
	inputPoints = inputPoints.concat(circleResult.points);
	var cst = [];
	for(var i = 0; i < circleResult.constraint.length; ++i) {
		cst.push(waveResult.points.length+circleResult.constraint[i]);
	}
	constraint.push(cst);

	draw();

	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 左クリック
		if(event.button == 0) {
			var canvasOffset = canvas.offset();
			var canvasX = Math.floor(event.pageX - canvasOffset.left);
			var canvasY = Math.floor(event.pageY - canvasOffset.top);
			if(canvasX < 0 || canvasX > canvasWidth) {
				return;
			}
			if(canvasY < 0 || canvasY > canvasHeight) {
				return;
			}
			inputPoints.push([canvasX, canvasY]);
			if(inputPoints.length == 2) {
				constraint.push(0);
				constraint.push(1);
				constraint.push(0);
			} else if(inputPoints.length > 2) {
				constraint.pop();
				constraint.push(inputPoints.length - 1);
				constraint.push(0);
			}
			draw();
		}
			// 右クリック
		else if(event.button == 2) {
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
				dist = mcdt.norm2(mcdt.sub(inputPoints[i], clickPos));
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
		constraint = [];
		selectPoint = null;

		var waveResult = waveCircle();
		inputPoints = waveResult.points;
		constraint = waveResult.constraint;

		draw();
	});

	// 点群の生成と三角形分割
	// レンダリングのリフレッシュを行う関数
	function draw() {

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);


		//console.log(""+inputPoints);
		//console.log(""+constraint);

		// 三角形分割
		if(false) {
			var result2 = delaunayTriangulation(inputPoints);
			drawResult(result2, context, constraint, inputPoints);
		}

		if(true) {
			var result = mcdt(inputPoints, constraint);
			drawResult(result, context, constraint, inputPoints);
		}


	}

	function drawResult(result, context, constraint, inputPoints) {
		if(result == null) {
			// 点の描画
			context.fillStyle = 'black';
			drawPoints(canvas, inputPoints, 3);
			return;
		}
		head = result.head;
		points = result.points;
		crossTri = result.crossTris;
		conn = result.connectivity;


		// 外接円の描画
		if($('#gaisetuenCheckBox').is(':checked')) {
			drawCircumcirclesFromHead(canvas, points, head);
		}


		// 拘束辺と交差している三角形の描画
		context.fillStyle = 'pink';
		for(var i = 0; i < crossTri.length; ++i) {
			for(var j = 0; j < crossTri[i].length; ++j) {
				if(crossTri[i][j].isRemoved) {
					continue;
				}
				context.beginPath();
				context.moveTo(points[crossTri[i][j].vertexID[0]][0], points[crossTri[i][j].vertexID[0]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[1]][0], points[crossTri[i][j].vertexID[1]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[2]][0], points[crossTri[i][j].vertexID[2]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[0]][0], points[crossTri[i][j].vertexID[0]][1]);
				context.fill();
			}
		}

		// 交差三角形と隣接している三角形の描画
		context.fillStyle = 'lightyellow';
		var adjTris = result.adjTris;
		for(var i = 0; i < adjTris.length; ++i) {
			if(adjTris[i].isRemoved) {
				continue;
			}
			if(adjTris[i].vertexID[0] > points.length
				|| adjTris[i].vertexID[1] > points.length
				|| adjTris[i].vertexID[2] > points.length) {
				continue;
			}
			context.beginPath();
			context.moveTo(points[adjTris[i].vertexID[0]][0], points[adjTris[i].vertexID[0]][1]);
			context.lineTo(points[adjTris[i].vertexID[1]][0], points[adjTris[i].vertexID[1]][1]);
			context.lineTo(points[adjTris[i].vertexID[2]][0], points[adjTris[i].vertexID[2]][1]);
			context.lineTo(points[adjTris[i].vertexID[0]][0], points[adjTris[i].vertexID[0]][1]);
			context.fill();
		}

		// 隣接関係の描画
		drawAdjacents(canvas, points, head);


		// 三角形headの描画
		if(head != null) {
			context.globalAlpha = 0.2;
			context.fillStyle = 'gray';
			context.beginPath();
			context.moveTo(points[head.vertexID[0]][0], points[head.vertexID[0]][1]);
			context.lineTo(points[head.vertexID[1]][0], points[head.vertexID[1]][1]);
			context.lineTo(points[head.vertexID[2]][0], points[head.vertexID[2]][1]);
			context.lineTo(points[head.vertexID[0]][0], points[head.vertexID[0]][1]);
			context.fill();
			context.globalAlpha = 1;
		}

		// 拘束辺の描画
		context.strokeStyle = 'lightgreen';
		context.lineWidth = 6;
		context.beginPath();
		for(var j = 0; j < constraint.length; ++j) {
			if(constraint[j].length != 0) {
				context.moveTo(inputPoints[constraint[j][0]][0], inputPoints[constraint[j][0]][1]);
			}
			for(var i = 1; i < constraint[j].length; ++i) {
				context.lineTo(inputPoints[constraint[j][i]][0], inputPoints[constraint[j][i]][1]);
			}
			context.stroke();
		}
		context.lineWidth = 1;

		// 拘束に失敗している辺の描画
		context.strokeStyle = 'red';
		var crossEdge = result.crossEdge;
		if(crossEdge != null) {
			context.lineWidth = 6;
			context.beginPath();
			var pointID = crossEdge[0];
			var pointID2 = crossEdge[1];
			context.moveTo(inputPoints[pointID][0], inputPoints[pointID][1]);
			context.lineTo(inputPoints[pointID2][0], inputPoints[pointID2][1]);
			context.stroke();
			context.lineWidth = 1;
		}

		// 三角形の描画
		context.strokeStyle = 'black';
		drawTrianglesFromHead(canvas, points, head);
		/*
		for(var i = 0; i < conn.length; ++i) {
			context.beginPath();
			context.moveTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.lineTo(points[conn[i][1]][0], points[conn[i][1]][1]);
			context.lineTo(points[conn[i][2]][0], points[conn[i][2]][1]);
			context.lineTo(points[conn[i][0]][0], points[conn[i][0]][1]);
			context.stroke();
		}
		*/

		// 点の描画
		context.fillStyle = 'black';
		drawPoints(canvas, points, 3);

		// 削除三角形の頂点の描画
		context.fillStyle = 'red';
		var rmPoints = [];
		for(var i = 0; i < result.rmVtx.length; ++i) {
			if(result.rmVtx[i] >= points.length) {
				continue;
			}
			rmPoints.push(points[result.rmVtx[i]]);
		}
		drawPoints(canvas, rmPoints, 2);

		/*
		// upperVtx
		context.fillStyle='purple';
		context.strokeStyle='purple';
		context.lineWidth=5;
		rmPoints=[];
		for(var i=0; i<result.upperVtx.length; ++i) {
			rmPoints.push(points[result.upperVtx[i]]);
		}
		drawPoints(canvas, rmPoints, 8);
		context.beginPath();
		if(rmPoints.length!=0) {
			context.moveTo(rmPoints[0][0], rmPoints[0][1]);
		}
		for(var i=1; i<rmPoints.length; ++i) {
			context.lineTo(rmPoints[i][0], rmPoints[i][1]);
		}
		context.stroke();
		context.lineWidth=1;
		// lowerVtx
		context.fillStyle='orange';
		context.strokeStyle='orange';
		context.lineWidth=5;
		rmPoints=[];
		for(var i=0; i<result.lowerVtx.length; ++i) {
			rmPoints.push(points[result.lowerVtx[i]]);
		}
		drawPoints(canvas, rmPoints, 4);
		context.beginPath();
		if(rmPoints.length!=0) {
			context.moveTo(rmPoints[0][0], rmPoints[0][1]);
		}
		for(var i=1; i<rmPoints.length; ++i) {
			context.lineTo(rmPoints[i][0], rmPoints[i][1]);
		}
		context.stroke();
		context.lineWidth=1;
		*/
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
		context.strokeStyle = 'skyblue';
		//context.strokeStyle = 'blue';
		v1 = mcdt.add(points[tri.vertexID[0]], points[tri.vertexID[1]]);
		v1 = mcdt.div(mcdt.add(v1, points[tri.vertexID[2]]), 3);
		for(var j = 0; j < 3; ++j) {
			if(tri.adjacent[j] == null) {
				continue;
			}
			if(tri.adjacent[j].adjacent[tri.edgeIDinAdjacent[j]]!==tri){
				continue;
			}

			// ボロノイ図的な図の描画のため
			v2 = mcdt.add(points[tri.adjacent[j].vertexID[0]], points[tri.adjacent[j].vertexID[1]]);
			v2 = mcdt.div(mcdt.add(v2, points[tri.adjacent[j].vertexID[2]]), 3);
			v12 = mcdt.sub(v2, v1);
			v12 = mcdt.mul(0.48, v12);
			edgeMid = mcdt.add(v1, v12);

			// 隣接三角形の辺の中点
			/*
			edgeMid = mcdt.add(points[tri.adjacent[j].vertexID[tri.edgeIDinAdjacent[j]]], points[tri.adjacent[j].vertexID[(tri.edgeIDinAdjacent[j] + 1) % 3]]);
			edgeMid = mcdt.mul(edgeMid, 0.5);
			*/

			context.beginPath();
			context.moveTo(v1[0], v1[1]);
			context.lineTo(edgeMid[0], edgeMid[1]);
			context.stroke();
		}
	}
}

// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />

var colors=['lightsalmon', 'lightseagreen', 'aquamarine', 'beige', 'burlywood', 'mistyrose', 'mediumpurple', 'darkcyan', 'darkgray', 'orchid', 'peru', 'dodgerblue'];
var N=1000;
var distMin=10;

$(document).ready(function () {
	initEvents($("#myCanvas"));
});

// キャンバスにイベントを紐付ける関数
function initEvents(canvas) {

	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();

	var inputPoints=[];	// 入力頂点
	var points=[];	// 頂点の座標群
	var head=[];	// DelaunayTriangleクラスのインスタンス配列
	var constraint=[];	// 拘束辺

	var selectPoint=null;

	draw();

	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 左クリック
		if(event.button==0) {
			var canvasOffset=canvas.offset();
			var canvasX=Math.floor(event.pageX-canvasOffset.left);
			var canvasY=Math.floor(event.pageY-canvasOffset.top);
			if(canvasX<0||canvasX>canvasWidth) {
				return;
			}
			if(canvasY<0||canvasY>canvasHeight) {
				return;
			}
			inputPoints.push([canvasX, canvasY]);
			if(inputPoints.length==2) {
				constraint.push(0);
				constraint.push(1);
				constraint.push(0);
			} else if(inputPoints.length>2) {
				constraint.pop();
				constraint.push(inputPoints.length-1);
				constraint.push(0);
			}
			draw();
		}
			// 右クリック
		else if(event.button==2) {
			var canvasOffset=canvas.offset();
			var canvasX=Math.floor(event.pageX-canvasOffset.left);
			var canvasY=Math.floor(event.pageY-canvasOffset.top);
			if(canvasX<0||canvasX>canvasWidth) {
				return;
			}
			if(canvasY<0||canvasY>canvasHeight) {
				return;
			}
			var clickPos=[canvasX, canvasY];
			var dist;
			for(var i=0; i<inputPoints.length; ++i) {
				dist=numeric.norm2(numeric.sub(inputPoints[i], clickPos));
				if(dist<10) {
					selectPoint=i;
					break;
				}
			}
		}
	});
	// mouse移動時のイベントコールバック設定
	canvas.mousemove(function (event) {
		var canvasOffset=canvas.offset();
		var canvasX=Math.floor(event.pageX-canvasOffset.left);
		var canvasY=Math.floor(event.pageY-canvasOffset.top);
		if(canvasX<0||canvasX>canvasWidth) {
			return;
		}
		if(canvasY<0||canvasY>canvasHeight) {
			return;
		}
		if(selectPoint!=null) {
			inputPoints[selectPoint]=[canvasX, canvasY];
			draw();
		}
	});
	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup(function (event) {
		selectPoint=null;
		draw();
	});

	$("input").click(function () {
		draw()
	});

	// リセットボタン
	$("#reset").click(function () {
		inputPoints=[];	
		points=[];	
		head=[];
		constraint=[];
		selectPoint=null;
		draw();
	});
	
	// 点群の生成と三角形分割
	// レンダリングのリフレッシュを行う関数
	function draw() {

		// 三角形分割
		var result=new delaunayTriangulation(inputPoints, canvasHeight, 0, canvasWidth, 0, constraint);
		head=result.head;
		points=result.points;
		crossTri = result.crossTris;

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 外接円の描画
		if($('#gaisetuenCheckBox').is(':checked')) {
			drawCircumcirclesFromHead(canvas, points, head);
		}

		// 拘束辺の描画
		context.strokeStyle='lightgreen';
		context.lineWidth=6;
		context.beginPath();
		if(constraint.length!=0) {
			context.moveTo(inputPoints[constraint[0]][0], inputPoints[constraint[0]][1]);
		}
		for(var i=1; i<constraint.length; ++i) {
			context.lineTo(inputPoints[constraint[i]][0], inputPoints[constraint[i]][1]);
		}
		context.stroke();
		context.lineWidth=1;


		// 拘束辺と交差している三角形の描画
		context.fillStyle='pink';
		for(var i=0; i<crossTri.length; ++i) {
			for(var j=0; j<crossTri[i].length; ++j) {
				context.beginPath();
				context.moveTo(points[crossTri[i][j].vertexID[0]][0], points[crossTri[i][j].vertexID[0]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[1]][0], points[crossTri[i][j].vertexID[1]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[2]][0], points[crossTri[i][j].vertexID[2]][1]);
				context.lineTo(points[crossTri[i][j].vertexID[0]][0], points[crossTri[i][j].vertexID[0]][1]);
				context.fill();
			}
		}
		

		// 拘束に失敗している辺の描画
		context.strokeStyle='red';
		context.lineWidth=6;
		var crossCnst=result.crossConstraint;
		for(var i=0; i<crossCnst.length; ++i) {
			context.beginPath();
			var crossID=crossCnst[i];
			var pointID=constraint[crossID];
			var pointID2=constraint[crossID+1];
			context.moveTo(inputPoints[pointID][0], inputPoints[pointID][1]);
			context.lineTo(inputPoints[pointID2][0], inputPoints[pointID2][1]);
			context.stroke();
		}
		context.lineWidth=1;

		// 三角形の描画
		context.strokeStyle='black';
		drawTrianglesFromHead(canvas, points, head);

		// 点の描画
		context.fillStyle='black';
		drawPoints(canvas, points);

	}
}


// 以下、描画関係


function drawPoints(canvas, points) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var i=0; i<points.length; ++i) {
		context.beginPath();
		context.arc(points[i][0], points[i][1], 3, 0, 2*Math.PI, true);
		context.fill();
	}
}

function drawTrianglesFromHead(canvas, points, head) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var tri=head; tri!=null; tri=tri.next) {
		context.beginPath();
		context.moveTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.lineTo(points[tri.vertexID[1]][0], points[tri.vertexID[1]][1]);
		context.lineTo(points[tri.vertexID[2]][0], points[tri.vertexID[2]][1]);
		context.lineTo(points[tri.vertexID[0]][0], points[tri.vertexID[0]][1]);
		context.stroke();
	}
}


function fillTrianglesFromHead(canvas, points, head) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	var i=0;
	for(var tri=head; tri!=null; tri=tri.next) {
		context.fillStyle=colors[i%colors.length];
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
	var context=canvas.get(0).getContext("2d");
	var cir;
	var i=0;
	context.globalAlpha=0.3;
	for(var tri=head; tri!=null; tri=tri.next) {
		context.fillStyle=colors[i%colors.length];
		context.beginPath();
		cir=new DelaunayTriangle.Circumcircle(points[tri.vertexID[0]], points[tri.vertexID[1]], points[tri.vertexID[2]]);
		context.arc(cir.p[0], cir.p[1], cir.rad, 0, Math.PI*2, true);
		context.fill();
		++i;
	}
	context.globalAlpha=1.0;
}



/**
cdt.js

Copyright (c) 2015 Kazuya Sase

This software is released under the MIT License.

http://opensource.org/licenses/mit-license.php

*/

// ドロネー三角形分割関数
// 引数 boundaryPoints: 閉境界を構成する点の座標 (例. [[x1, y1], [x2, y2], ...] )
// 引数 holeBoundaryPoints: 穴境界を構成する点の座標 (例. [[x1, y1], [x2, y2], ...] )
// 返り値：
//    オブジェクト
//    points: 点の座標リスト (inputPointsに加えて点群を内包する大きい三角形の頂点を含む)
//    connectivity: 三角形を構成する頂点IDの配列 
//       (例. [[pointID1, pointID2, pointID3], [pointID4, pointID5, pointID6], ... ])
//    head: ドロネー三角形クラスの連結リストの先頭への参照
function cdt(boundaryPoints, holeBoundaryPoints, option) {


	// STEP0: 入力データの作成
	if(option == undefined) {
		option = {triSize:0, numSmoothing:0};
	}
	var resultInputGen = cdt.generateInputData(boundaryPoints, holeBoundaryPoints, option.triSize, option.cutoffLength);
	// 点の座標を格納する配列
	var points = resultInputGen.points;
	// cst: constrainsの略
	// 閉境界を構成する点のID [pointID1, pointID2,.... ] 
	// 先頭要素 = 最終要素 となるように作成される
	var cst = resultInputGen.constraint;
	// 入力点が3以下の場合、強制終了
	if(points.length < 3) {
		return null;
	}


	// STEP1: スーパートライアングルの作成
	// すべての点を内包する
	// 大きい三角形(superTriangle)の頂点を追加
	// これを元にドロネー分割の初期三角形を作成
	// 三角形オブジェクトは連結リストで格納される
	// headは連結リストの先頭を表す
	cdt.addSuperTriangleToPoints(points);
	var head = new cdt.DelaunayTriangle(points, [points.length - 3, points.length - 2, points.length - 1]);


	// STEP2: 点の逐次追加
	// まず点を内包する三角形を探し（ローソンの探査法），
	// その後、スワッピングアルゴリズムを用いて分割．
	// ローソンの探査法は探査開始三角形の入力が必要．
	// 探査開始三角形の初期値はheadで
	// 次の探査開始三角形は前ループの探査結果とする
	var resultTri = head;
	for(var i = 0; i < points.length - 3; ++i) {
		resultTri = cdt.DelaunayTriangle.lawsonTriangleDetection(points, resultTri, points[i]);
		resultTri.addPoint(i, points, cst);
	}

	// STEP3: 辺と閉境界との交差判定と交差解消
	var itrCount = 0;
	while(!option.softConstraint) {
		if(itrCount > 2 * points.length) {
			console.log("max iteration at cdt()");
			break;
		}
		// 辺と閉境界との交差判定
		var resultCrossTri = cdt.getCrossTriConstraint(points, head, cst);
		var crossEdge = resultCrossTri.crossEdge;
		var crossTri = resultCrossTri.crossTri;
		// 交差三角形頂点の抽出
		var rmVtx = cdt.extractVerticesFromTri(crossTri);
		var resultULV = cdt.getUpperAndLowerVtx(points, crossEdge, rmVtx);
		// 交差三角形の削除
		var rmTriResult = cdt.removeCrossTriAndExtractOuterEdge(crossTri, head);
		head = rmTriResult.head;
		// 新しい三角形の追加
		if(crossEdge != null) {
			var upperHead = cdt.addInnerVetices(points, crossEdge, resultULV.upperVtx, rmTriResult.adjTris, head);
			var lowerHead = cdt.addInnerVetices(points, crossEdge, resultULV.lowerVtx, rmTriResult.adjTris, head);
			cdt.updateLocalAdjacentsLU(upperHead, lowerHead);
		} else {
			break;
		}
		++itrCount;
	}

	// STEP4: スーパートライアングルの削除
	head = cdt.removeSuperTriangle(head, points);

	// STEP5: 境界の内外判定と外部三角形の削除
	head = cdt.removeOuterTriangles(head, points, boundaryPoints, holeBoundaryPoints);

	// STEP6: 三角形の品質向上のための平滑化
	cdt.smoothing(head, points, cst, option.numSmoothing);

	// 三角形接続リストの作成
	var conn = [];
	for(var tri = head; tri != null; tri = tri.next) {
		conn.push(tri.vertexID);
	}

	return {
		points: points,
		connectivity: conn
	};
}



cdt.smoothing = function (head, points, cst, numSmoothing) {
	if(numSmoothing <= 0) {
		return;
	}
	var itr;
	if(numSmoothing == undefined) {
		itr = 10;
	} else {
		itr = numSmoothing;
	}
	var dataForSmoothing = cdt.dataForSmoothing(head, points, cst);
	for(var i = 0; i < itr; ++i) {
		cdt.laplacianSmoothing(points, dataForSmoothing);
	}
}

cdt.dataForSmoothing = function (head, points, cst) {
	// 点が境界上であるかどうかを判別するフラグ配列の作成
	var isOnBoundary = new Array(points.length);
	for(var i = 0; i < isOnBoundary.length; ++i) {
		isOnBoundary[i] = false;
	}
	for(var i = 0; i < cst.length; ++i) {
		for(var j = 0; j < cst[i].length; ++j) {
			isOnBoundary[cst[i][j]] = true;
		}
	}
	// 点からその点を共有する三角形へアクセスする配列の作成
	var posToTri = new Array(points.length);
	for(var i = 0; i < points.length; ++i) {
		posToTri[i] = [];
	}
	for(var tri = head; tri != null; tri = tri.next) {
		posToTri[tri.vertexID[0]].push(tri);
		posToTri[tri.vertexID[1]].push(tri);
		posToTri[tri.vertexID[2]].push(tri);
	}
	return { isOnBoundary: isOnBoundary, posToTri: posToTri };
}

// 三角形の品質向上のための平滑化処理
// ラプラシアンスムージングを行う．
// すなわち，それぞれの内部頂点について
// 辺で結合している周辺頂点の重心を新たな座標とする
cdt.laplacianSmoothing = function (points, data) {
	var isOnBoundary = data.isOnBoundary;
	var posToTri = data.posToTri;
	// 平滑化
	var outputPoints = cdt.clone(points);
	for(var i = 0; i < points.length; ++i) {
		// 点が境界上であれば何もしない
		if(isOnBoundary[i]) {
			continue;
		}
		// 点を共有する三角形から頂点番号を抽出
		var surroundVtx = [];
		for(var j = 0; j < posToTri[i].length; ++j) {
			surroundVtx.push(posToTri[i][j].vertexID[0]);
			surroundVtx.push(posToTri[i][j].vertexID[1]);
			surroundVtx.push(posToTri[i][j].vertexID[2]);
		}
		// 重複する頂点IDを削除
		surroundVtx = surroundVtx.filter(function (x, ii, self) {
			return self.indexOf(x) === ii;
		});
		// 着目している頂点IDを削除
		surroundVtx = surroundVtx.filter(function (x) {
			return x !== i;
		});

		var tmp = [0, 0];
		for(var j = 0; j < surroundVtx.length; ++j) {
			tmp = cdt.add(tmp, points[surroundVtx[j]]);
		}
		outputPoints[i] = cdt.div(tmp, surroundVtx.length);
	}

	for(var i = 0; i < points.length; ++i) {
		points[i] = cdt.clone(outputPoints[i]);
	}
}


cdt.generateInputData = function (inputBoundaryPoints, inputHoleBoundaryPoints, triSize, cutoffLength) {

	// 0. 入力境界を最小距離で間引く
	// 境界の点群で隣同士の点が cutoffLength 以下に
	// なるように間引く
	if(cutoffLength == undefined) {
		cutoffLength = 0;
	}
	var boundaryPoints = cullBoundary(inputBoundaryPoints, cutoffLength);
	var holeBoundaryPoints = cullBoundary(inputHoleBoundaryPoints, cutoffLength);
	function cullBoundary(boundary, cutoffLength) {
		var output = [];
		var tailPos;
		var vec;
		for(var i = 0; i < boundary.length; ++i) {
			var single = [boundary[i][0]];
			for(var j = 1; j < boundary[i].length; ++j) {
				tailPos = single[single.length - 1];
				vec = cdt.sub(tailPos, boundary[i][j]);
				if(cdt.norm2(vec) > cutoffLength) {
					single.push(boundary[i][j]);
				}
			}
			output.push(single);
		}
		return output;
	}

	// 1. points の作成
	// 入力された点の座標値はすべて一様に
	// points 配列に格納する
	// 格納の順番はboundaryPointsの先頭から開始し
	// その後，holeBoundaryPointsとする
	var numPoints = 0;
	for(var i = 0; i < boundaryPoints.length; ++i) {
		numPoints += boundaryPoints[i].length;
	}
	for(var i = 0; i < holeBoundaryPoints.length; ++i) {
		numPoints += holeBoundaryPoints[i].length;
	}
	var points = new Array(numPoints);
	var cntPt = 0;
	for(var i = 0; i < boundaryPoints.length; ++i) {
		for(var j = 0; j < boundaryPoints[i].length; ++j) {
			points[cntPt] = cdt.clone(boundaryPoints[i][j]);
			++cntPt;
		}
	}
	for(var i = 0; i < holeBoundaryPoints.length; ++i) {
		for(var j = 0; j < holeBoundaryPoints[i].length; ++j) {
			points[cntPt] = cdt.clone(holeBoundaryPoints[i][j]);
			++cntPt;
		}
	}

	// 2. constraintの作成
	var constraint = new Array(boundaryPoints.length + holeBoundaryPoints.length);
	var cntBnd = 0;
	// 閉境界は cst[0]=cst[length-1] となるようにする
	for(var i = 0; i < boundaryPoints.length; ++i) {
		constraint[i] = new Array(boundaryPoints[i].length);
		for(var j = 0; j < constraint[i].length; ++j) {
			constraint[i][j] = cntBnd;
			++cntBnd
		}
		constraint[i].push(constraint[i][0]);
	}
	var offset = boundaryPoints.length;
	for(var i = 0; i < holeBoundaryPoints.length; ++i) {
		constraint[i + offset] = new Array(holeBoundaryPoints[i].length);
		for(var j = 0; j < constraint[i + offset].length; ++j) {
			constraint[i + offset][j] = cntBnd;
			++cntBnd
		}
		constraint[i + offset].push(constraint[i + offset][0]);
	}

	// triSizeが指定されていないときは終了
	if(triSize == undefined || triSize <= 0) {
		return {
			points: points,
			constraint: constraint
		}
	}


	// 3. 境界内に追加する点の追加

	// triSize が　auto のとき，
	// 境界のすべての辺の長さの平均をもとめて
	// 
	if(triSize == 'auto') {
		var averageLength = 0;
		var entryCount = 0;
		var edgeVec;
		for(var i = 0; i < boundaryPoints.length; ++i) {
			for(var j = 0; j < boundaryPoints[i].length; ++j) {
				edgeVec = cdt.sub(boundaryPoints[i][(j + 1) % boundaryPoints[i].length], boundaryPoints[i][j]);
				averageLength += cdt.norm2(edgeVec);
				++entryCount;
			}
		}
		for(var i = 0; i < holeBoundaryPoints.length; ++i) {
			for(var j = 0; j < holeBoundaryPoints[i].length; ++j) {
				edgeVec = cdt.sub(holeBoundaryPoints[i][(j + 1) % holeBoundaryPoints[i].length], holeBoundaryPoints[i][j]);
				averageLength += cdt.norm2(edgeVec);
				++entryCount;
			}
		}
		averageLength /= entryCount;
		triSize = averageLength * 2;
	}
	var additionalPoints = [];
	var xmax = points[0][0];
	var xmin = points[0][0];
	var ymax = points[0][1];
	var ymin = points[0][1];
	for(var i = 0; i < points.length; ++i) {
		if(xmax < points[i][0]) {
			xmax = points[i][0];
		}
		if(xmin > points[i][0]) {
			xmin = points[i][0];
		}
		if(ymax < points[i][1]) {
			ymax = points[i][1];
		}
		if(ymin > points[i][1]) {
			ymin = points[i][1];
		}
	}
	var xdiv = (xmax - xmin) / triSize;
	var ydiv = (ymax - ymin) / triSize;
	var newPt;
	for(var i = 0; i < xdiv + 1; ++i) {
		for(var j = 0; j < ydiv + 1; ++j) {
			newPt = [xmin + triSize * i, ymin + triSize * j];
			if(cdt.isPointInsideOfBoundaries(newPt, boundaryPoints, holeBoundaryPoints)) {
				additionalPoints.push(newPt);
			}
		}
	}
	points = points.concat(additionalPoints);


	return {
		points: points,
		constraint: constraint
	}
}



cdt.removeCrossTriAndExtractOuterEdge = function (crossTri, head) {
	// 交差三角形の隣接三角形として登録されているものをすべて抽出する
	var adjTriAll = [];
	for(var i = 0; i < crossTri.length; ++i) {
		for(var j = 0; j < 3; ++j) {
			adjTriAll.push(crossTri[i].adjacent[j]);
		}
	}
	// 交差三角形を削除する
	for(var j = 0; j < crossTri.length; ++j) {
		head = crossTri[j].remove(head);
	}
	// 隣接三角形のうち削除されていないものを残す
	var adjTris = [];
	for(var i = 0; i < adjTriAll.length; ++i) {
		if(adjTriAll[i] == null) {
			continue;
		}
		if(!adjTriAll[i].isRemoved) {
			adjTris.push(adjTriAll[i]);
		}
	}
	return { adjTris: adjTris, head: head };
}


cdt.addInnerVetices = function (points, crossEdge, localVtx, adjTris, head) {
	// localVtxを辺中点にたいして反時計回りになるように並べ替え
	var midpoint = cdt.mul(0.5, cdt.add(points[crossEdge[0]], points[crossEdge[1]]));
	var ccw = function (val1, val2) {
		th1 = Math.atan2(points[val1][1] - midpoint[1], points[val1][0] - midpoint[0]);
		th2 = Math.atan2(points[val2][1] - midpoint[1], points[val2][0] - midpoint[0]);
		return th1 - th2;
	}
	localVtx.sort(ccw);
	var localHead = cdt.innerTriangulation(points, localVtx);
	if(localHead != null) {
		cdt.updateLocalAdjacents(localHead, adjTris);
		var tail = cdt.getTail(head);
		tail.next = localHead;
		localHead.prev = tail;
	}
	return localHead;
}


// upper三角形群とlower三角形群の隣接関係を更新する
cdt.updateLocalAdjacentsLU = function (upperHead, lowerHead) {
	if(upperHead == null || lowerHead == null) {
		console.log("upperHead is null. upperHead:" + upperHead + " lowerHead:" + lowerHead);
		return;
	}
	var adjTris = [];
	for(var tri = lowerHead; tri != null; tri = tri.next) {
		adjTris.push(tri);
	}
	cdt.updateLocalAdjacents(upperHead, adjTris);
}



// 新しく追加される三角形の境界辺において
// 親三角形群との隣接関係を更新する
cdt.updateLocalAdjacents = function (localHead, adjTris) {
	// すべてのtriのadjacentを調べて，nullならば
	// 周辺三角形adjTrisから辺の頂点IDが一致する
	// ものを探して それぞれの adjacent と edgeIDinAdj を
	// 更新する
	for(var tri = localHead; tri != null; tri = tri.next) {
		for(var i = 0; i < 3; ++i) {
			if(tri.adjacent[i] == null) {
				for(var j = 0; j < adjTris.length; ++j) {
					for(var k = 0; k < 3; ++k) {
						if(tri.vertexID[i] == adjTris[j].vertexID[(k + 1) % 3]
							&& tri.vertexID[(i + 1) % 3] == adjTris[j].vertexID[k]) {
							tri.adjacent[i] = adjTris[j];
							adjTris[j].adjacent[k] = tri;
							tri.edgeIDinAdjacent[i] = k;
							adjTris[j].edgeIDinAdjacent[k] = i;
						}
					}
				}
			}
		}
	}
}


cdt.getTail = function (head) {
	var tail = head;
	while(1) {
		if(tail.next == null) {
			break;
		} else {
			tail = tail.next;
		}
	}
	return tail;
}

cdt.innerTriangulation = function (points, innerVtx) {

	// 頂点数が3の時は分割するまでもないので
	// そのまま3点を結合した三角形を返す
	// むしろ3点でドロネー分割すると三角形が
	// 消滅することがある
	if(innerVtx.length == 3) {
		return new cdt.DelaunayTriangle(points, [innerVtx[0], innerVtx[1], innerVtx[2]]);
	}

	// 親の頂点群から三角形分割する頂点を抜き出す
	var innerPoints = new Array(innerVtx.length);
	for(var i = 0; i < innerPoints.length; ++i) {
		innerPoints[i] = cdt.clone(points[innerVtx[i]]);
	}

	// innerVtxが輪郭の辺に沿ってCCWで格納されている
	// ことを想定するため
	// constraintは [0, 1, 2, ...] となる
	var constraint = new Array(innerVtx.length);
	for(var i = 0; i < innerVtx.length; ++i) {
		constraint[i] = i;
	}
	// 閉境界 cst[0]=cst[length-1] となるようにする
	var cst = cdt.clone(constraint);
	if(cst[0] != cst[cst.length - 1]) {
		cst.push(cst[0]);
	}
	// STEP1: スーパートライアングルの作成
	cdt.addSuperTriangleToPoints(innerPoints);
	var l = innerPoints.length;
	var head = new cdt.DelaunayTriangle(innerPoints, [l - 3, l - 2, l - 1]);
	// STEP2: 点の逐次追加
	var resultTri = head;
	for(var i = 0; i < innerPoints.length - 3; ++i) {
		resultTri = cdt.DelaunayTriangle.lawsonTriangleDetection(innerPoints, resultTri, innerPoints[i]);
		resultTri.addPoint(i, innerPoints, cst);
	}
	// スーパートライアングルの削除
	head = cdt.removeSuperTriangle(head, innerPoints);
	// 外部三角形の削除
	head = cdt.removeOuterTrianglesForInnerTriangulation(head, cst);

	// 親ドロネーの頂点インデックスに書き換える
	for(var tri = head; tri != null; tri = tri.next) {
		for(var i = 0; i < 3; ++i) {
			tri.vertexID[i] = innerVtx[tri.vertexID[i]];
		}
	}
	return head;
}

// 境界の内外判定と外部三角形の削除
// 谷口，FEMのための要素自動分割，P35の内外判定法を用いる
cdt.removeOuterTrianglesForInnerTriangulation = function (head, cst) {
	var cstVtxID = new Array(3);
	var signs = new Array(3);
	var trinext;
	for(var tri = head; tri != null; tri = trinext) {
		cstVtxID = [null, null, null];
		// 頂点IDの境界線におけるIDを取得
		for(var i = 0; i < 3; ++i) {
			for(var j = 0; j < cst.length - 1; ++j) {
				if(tri.vertexID[i] == cst[j]) {
					cstVtxID[i] = cst[j];
					break;
				}
			}
		}
		for(var i = 0; i < 3; ++i) {
			signs[i] = cstVtxID[(i + 1) % 3] - cstVtxID[i];
		}
		trinext = tri.next;
		if(signs[0] * signs[1] * signs[2] > 0) {
			head = tri.remove(head);
		}
	}
	return head;
}


// 境界の内外判定と外部三角形の削除
// 三角形の重心と境界の内外判定を行い，
// 境界の外部であれば三角形を削除する
// 三角形の隣接関係を用いれば高速化できるかもしれない
cdt.removeOuterTriangles = function (head, points, boundaryPoints, holeBoundaryPoints) {
	var trinext;
	for(var tri = head; tri != null; tri = trinext) {
		trinext = tri.next;
		var triCenter = cdt.add(points[tri.vertexID[0]], points[tri.vertexID[1]]);
		triCenter = cdt.div(cdt.add(triCenter, points[tri.vertexID[2]]), 3);
		if(!cdt.isPointInsideOfBoundaries(triCenter, boundaryPoints, holeBoundaryPoints)) {
			head = tri.remove(head);
		}
	}
	return head;
}


// 点が境界内部で穴の外に存在するかどうかを判別する
// boundaryPoints, holeBoundaryPoints には境界上の点の座標を格納する
cdt.isPointInsideOfBoundaries = function (p, boundaryPoints, holeBoundaryPoints) {
	var isInHole = false;
	// 穴境界に含まれれば削除
	for(var i = 0; i < holeBoundaryPoints.length; ++i) {
		if(cdt.isPointInsideOfBoundary(p, holeBoundaryPoints[i])) {
			isInHole = true;
			return false;
		}
	}
	// 通常境界のいずれにも含まれなければ削除
	if(!isInHole) {
		for(var i = 0; i < boundaryPoints.length; ++i) {
			if(cdt.isPointInsideOfBoundary(p, boundaryPoints[i])) {
				return true;
			}
		}
	}
	return false;
}

// boundary には境界上の点の座標を格納する
cdt.isPointInsideOfBoundary = function (p, boundary) {
	if(p.length == 0) return flase;
	// +x方向へレイを出す
	var countxp = 0;
	var ZERO = 1e-10;
	var edge;
	for(var j = 0; j < boundary.length; j++) {
		edge = new cdt.LineSeg(boundary[j], boundary[(j + 1) % boundary.length]);
		// pを通りx軸に平行な直線に交わるかどうか
		var dys = edge.start[1] - p[1];
		var dye = edge.end[1] - p[1];
		if(Math.abs(dys) < ZERO) dys = 0;
		if(Math.abs(dye) < ZERO) dye = 0;
		if(dys * dye > 0) continue;
		// 線分がx軸に平行な場合は除外
		if(Math.abs(edge.start[1] - edge.end[1]) < ZERO) continue;
		// pを通り+x方向に出したレイが線分と交わるかどうか
		var interx = edge.crossXpos(p[1]);
		if(interx < p[0]) continue;
		// 交点が線分のend側だった場合、交わっていないとみなす
		if(
			Math.abs(interx - edge.end[0]) < ZERO
			&&
			Math.abs(p[1] - edge.end[1]) < ZERO
		) {
			continue;
		}
		// 交点が線分のstart側だが接点である場合、交わっていないとみなす
		if(
			Math.abs(interx - edge.start[0]) < ZERO
			&&
			Math.abs(p[1] - edge.start[1]) < ZERO
		) {
			var stEdgeY;	// start側の辺のy座標
			if(j == 0) {
				stEdgeY = boundary[boundary.length - 1][1];
			} else {
				stEdgeY = boundary[j - 1][1];
			}
			if((edge.end[1] - edge.start[1]) * (stEdgeY - edge.start[1]) >= 0) {
				continue;
			}
		}
		++countxp;
	}
	return countxp % 2 == 1;
}




// cstで定義される辺ベクトルで
// 頂点群vtxを分割し，upperVtx, lowerVtxに分ける
// 辺ベクトル上の頂点は両方に含まれる
cdt.getUpperAndLowerVtx = function (points, crossEdge, vtx) {
	var upperVtx = [];
	var lowerVtx = [];
	if(crossEdge != null) {
		var cstVec = cdt.sub(points[crossEdge[0]], points[crossEdge[1]]);
		var vtxVec;
		for(var i = 0; i < vtx.length; ++i) {
			vtxVec = cdt.sub(points[vtx[i]], points[crossEdge[1]]);
			if(cstVec[0] * vtxVec[1] - cstVec[1] * vtxVec[0] > 0) {
				upperVtx.push(vtx[i]);
			} else if(cstVec[0] * vtxVec[1] - cstVec[1] * vtxVec[0] < 0) {
				lowerVtx.push(vtx[i]);
			}
		}
		upperVtx.push(crossEdge[0]);
		upperVtx.push(crossEdge[1]);
		lowerVtx.push(crossEdge[0]);
		lowerVtx.push(crossEdge[1]);
	}

	return { upperVtx: upperVtx, lowerVtx: lowerVtx };
}


// DelauneyTriangleの辺と閉境界との交差判定
cdt.getCrossTriConstraint = function (points, head, cst) {
	// 点から三角形へアクセスするためのデータ作成
	var pointToTri = cdt.makePointToTri(points, head);
	var crossEdge = null;
	var crossTri = [];
	var isCrossFound = false;
	for(var i = 0; i < cst.length; ++i) {
		for(var j = 0; j < cst[i].length - 1; ++j) {
			crossTri = cdt.isEdgeCross(points, pointToTri, cst[i], j);
			if(crossTri.length > 0) {
				crossEdge = [cst[i][j + 1], cst[i][j]];
				isCrossFound = true;
				break;
			}
		}
		if(isCrossFound) {
			break;
		}
	}
	return { crossTri: crossTri, crossEdge: crossEdge };
}


// DelauneyTriangleオブジェクトの配列から
// 重複のない頂点IDを抽出する
cdt.extractVerticesFromTri = function (triAry) {
	var vtx = [];
	for(var i = 0; i < triAry.length; ++i) {
		for(var j = 0; j < 3; ++j) {
			vtx.push(triAry[i].vertexID[j]);
		}
	}
	// 重複を解消して昇順にソート
	vtx = vtx.filter(function (x, i, self) {
		return self.indexOf(x) === i;
	});
	vtx.sort(
		function (a, b) {
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		}
	);
	return vtx;
}

cdt.removeSuperTriangle = function (head, points) {
	var isSuperVtx;
	var tri = head;
	while(1) {
		if(tri == null) {
			break;
		}
		isSuperVtx = false;
		for(var i = 0; i < 3; ++i) {
			for(var j = 0; j < 3; ++j) {
				if(tri.vertexID[i] == points.length - 1 - j) {
					isSuperVtx = true;
					break;
				}
			}
		}
		if(isSuperVtx) {
			if(tri === head) {
				head = tri.remove(head);
				tri = head;
			} else {
				var nextTmp = tri.next;
				tri.remove(head);	// 削除対象がheadでないことは確実
				tri = nextTmp;
			}
		} else {
			tri = tri.next;
		}
	}

	points.splice(points.length-3, 3)
	return head;
}


// i番目の拘束辺の交差判定
// 注意, 引数のcstは一つの境界 [境界頂点1のID, 境界頂点2のID, ...]
cdt.isEdgeCross = function (points, pointToTri, cst, i) {
	var edgePos = [points[cst[i]], points[cst[i + 1]]];	// 辺の始点・終点の座標 [[始点],[終点]]
	// 拘束辺の始点を含む三角形についてのループ
	var tri;
	var adjEdge = null;
	for(var j = 0; j < pointToTri[cst[i]].length; ++j) {
		tri = pointToTri[cst[i]][j];
		adjEdge = cdt.isTriAndEdgeCross(points, tri, edgePos);
		if(adjEdge != null) {
			break;
		}
	}
	if(adjEdge == null) {
		return [];
	}

	var crossTri = [tri];
	var edgeIDinAdj;
	for(; ;) {
		edgeIDinAdj = tri.edgeIDinAdjacent[adjEdge];
		tri = tri.adjacent[adjEdge];
		if(tri == null) {
			console.log("ERROR at isEdgeCross");
			break;
		}
		crossTri.push(tri);
		if(tri.vertexID[(edgeIDinAdj + 2) % 3] == cst[i + 1]) {
			break;
		}
		adjEdge = cdt.isTriAndEdgeCross(points, tri, edgePos, edgeIDinAdj);
	}
	return crossTri;
}


// 三角形と辺の交差判定
// 交差している場合, triのうちの交差している辺番号を返す
// そうでない場合，nullを返す
cdt.isTriAndEdgeCross = function (points, tri, edgePos, except) {
	var triPos = [[0, 0], [0, 0], [0, 0]];	// 三角形の頂点座標　[[頂点1],[頂点2],[頂点3]]
	for(var k = 0; k < 3; ++k) {
		triPos[k] = points[tri.vertexID[k]];
	}
	for(var k = 0; k < 3; ++k) {
		if(cdt.isIntersect(edgePos, [triPos[k], triPos[(k + 1) % 3]])) {
			if(k != except) {
				return k;
			}
		}
	}
	return null;
}

// pointToTriの作成
cdt.makePointToTri = function (points, head) {
	var pointToTri = new Array(points.length);
	for(var i = 0; i < pointToTri.length; ++i) {
		pointToTri[i] = [];
	}
	for(var tri = head; tri != null; tri = tri.next) {
		pointToTri[tri.vertexID[0]].push(tri);
		pointToTri[tri.vertexID[1]].push(tri);
		pointToTri[tri.vertexID[2]].push(tri);
	}
	return pointToTri;
}


// 線分の衝突
// 参考: http://marupeke296.com/COL_2D_No10_SegmentAndSegment.html
cdt.isIntersect = function (s1, s2) {
	var v = cdt.sub(s2[0], s1[0]);
	var v1 = cdt.sub(s1[1], s1[0]);
	var v2 = cdt.sub(s2[1], s2[0]);
	var crs_v1_v2 = v1[0] * v2[1] - v1[1] * v2[0];
	if(crs_v1_v2 == 0.0) {
		return false	// 平行状態
	}
	var crs_v_v1 = v[0] * v1[1] - v[1] * v1[0];
	var crs_v_v2 = v[0] * v2[1] - v[1] * v2[0];
	var t1 = crs_v_v2 / crs_v1_v2;
	var t2 = crs_v_v1 / crs_v1_v2;
	var eps = 0.00001;
	// 1点のみを共有する場合は交差とみなさない
	if(t1 - eps <= 0 || t1 + eps >= 1 || t2 - eps <= 0 || t2 + eps >= 1) {
		return false;	// 交差していない
	} else {
		return true;	// 交差している
	}
}

cdt.addSuperTriangleToPoints = function (points) {
	if(points.length == 0) {
		return [[0, 0], [0, 0], [0, 0]];
	}
	// AABBを作成
	var ymin = points[0][1];
	var ymax = points[0][1];
	var xmax = points[0][0];
	var xmin = points[0][0];
	for(var i = 1; i < points.length; ++i) {
		if(xmin > points[i][0]) {
			xmin = points[i][0];
		}
		if(xmax < points[i][0]) {
			xmax = points[i][0];
		}
		if(ymin > points[i][1]) {
			ymin = points[i][1];
		}
		if(ymax < points[i][1]) {
			ymax = points[i][1];
		}
	}
	// AABBを内包する円の半径rと中心(cx,cy)を求める
	var r;
	if(xmax - xmin > ymax - ymin) {
		r = xmax - xmin;
	} else {
		r = ymax - ymin;
	}
	var cx = (xmax - xmin) * 0.5 + xmin;
	var cy = (ymax - ymin) * 0.5 + ymin;
	// 求めた円を内包する大き目の正三角形をスーパートライアングルとする
	var l = 4 * r;
	var superTri = new Array(3);
	superTri[0] = [cx - 0.5 * l, cy - 1.732 / 6 * l];
	superTri[1] = [cx + 0.5 * l, cy - 1.732 / 6 * l];
	superTri[2] = [cx, cy + 1.732 / 3 * l];


	points.push(superTri[0]);
	points.push(superTri[1]);
	points.push(superTri[2]);
}


// ドロネー三角形分割用の三角形クラス
// 引数 points 頂点の座標 [[x1,y1],[x2,y2],......]
// 引数 indices 頂点のインデックス
cdt.DelaunayTriangle = function(points, indices) {
	this.adjacent;			// 隣接する三角形の参照，辺12, 辺23，辺31において隣接する三角形を順に格納する
	this.edgeIDinAdjacent;	// adjacentの各要素と対応．adjacent[i]が隣接する辺ID．辺IDはadjacent側のもの．	
	this.vertexID;			// 三角形の頂点のpoints配列におけるインデックス
	this.prev;	// 双方向連結リストの前ポインタ
	this.next;	// 双方向連結リストの次ポインタ
	this.init(points, indices);
	this.isRemoved;	// 削除フラグ
}

// 初期化関数
// コンストラクタとして使う
cdt.DelaunayTriangle.prototype.init = function (points, indices) {
	this.adjacent = [null, null, null];
	this.edgeIDinAdjacent = [-1, -1, -1];
	this.vertexID = cdt.clone(indices);
	this.prev = null;
	this.next = null;
	// 頂点が反時計回りになるように並べ替える
	// v1 cross v2 のz座標が負であれば時計回り
	var v1 = cdt.sub(points[this.vertexID[1]], points[this.vertexID[0]]);
	var v2 = cdt.sub(points[this.vertexID[2]], points[this.vertexID[0]]);
	var tmp;
	if(v1[0] * v2[1] - v1[1] * v2[0] < 0) {
		tmp = this.vertexID[1];
		this.vertexID[1] = this.vertexID[2];
		this.vertexID[2] = tmp;
	}
	this.isRemoved = false;
}

// プロパティをコピーする
// 参照のプロパティ以外は値コピー
cdt.DelaunayTriangle.prototype.cloneProperties = function () {
	return {
		adjacent: this.adjacent,
		edgeIDinAdjacent: cdt.clone(this.edgeIDinAdjacent),
		vertexID: cdt.clone(this.vertexID),
		prev: this.prev,
		next: this.next
	};
}


// 三角形の削除
// この三角形を削除して隣接三角形の参照をはずす
// 連結リストでは前後の三角形を連結させる
// 連結リストの次の三角形への参照を返す
// 削除される三角形がheadだった場合は、
// headを次の三角形の参照に変更する
// 使用例）head=tri.remove(tri) のように呼び出す
cdt.DelaunayTriangle.prototype.remove = function (head) {
	if(this.isRemoved) {
		return null;
	}
	for(var i = 0; i < 3; ++i) {
		if(this.adjacent[i] != null) {
			this.adjacent[i].adjacent[this.edgeIDinAdjacent[i]] = null;
		}
	}
	this.edgeIDinAdjacent = [];
	this.adjacent = null;
	if(this.next != null) {
		this.next.prev = this.prev;
	}
	if(this.prev != null) {
		this.prev.next = this.next;
	}
	this.prev = null;

	// もし削除する三角形がheadならば
	// nextに格納されている三角形をheadとする
	if(this === head) {
		head = this.next;
	}
	this.next = null;
	this.isRemoved = true;
	return head;
}

// 新しい点を追加して三角形を分割する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
cdt.DelaunayTriangle.prototype.addPoint = function (newPointID, points, constraint) {

	// STEP1: 
	// 追加点pを内包する三角形Tを三分割する
	// Tの頂点をp1,p2,p3とすると
	// 3つの新しい三角形 (p,p1,p2),(p,p2,p3),(p,p3,p1) が追加される
	// ただし，Tのメモリ領域を(p,p1,p2)に割り当てる

	// 削除する三角形のプロパティを退避
	var rmTri = this.cloneProperties();

	// 新しい三角形オブジェクトの作成
	// 0番目の三角形はthisの領域を用いる
	var indices;
	var newTri = new Array(3);
	for(var i = 0; i < 3; ++i) {
		indices = [newPointID, rmTri.vertexID[i], rmTri.vertexID[(i + 1) % 3]];
		if(i == 0) {
			newTri[i] = this;
			newTri[i].init(points, indices);
		} else {
			newTri[i] = new cdt.DelaunayTriangle(points, indices);
		}
	}

	// next の更新
	if(rmTri.prev != null) {
		rmTri.prev.next = newTri[0];
	}
	newTri[0].next = newTri[1];
	newTri[1].next = newTri[2];
	newTri[2].next = rmTri.next;

	// prev の更新
	if(rmTri.next != null) {
		rmTri.next.prev = newTri[2];
	}
	newTri[2].prev = newTri[1];
	newTri[1].prev = newTri[0];
	newTri[0].prev = rmTri.prev;

	// adjacent, edgeIDAdjacent の更新
	// newPointを含む辺では他のnewTriと隣接
	// newPointを含まない辺では,
	// もともとの三角形の隣接三角形と隣接する
	for(var i = 0; i < 3; ++i) {
		newTri[i].adjacent[0] = newTri[(i + 2) % 3];
		newTri[i].adjacent[1] = rmTri.adjacent[i];
		newTri[i].adjacent[2] = newTri[(i + 1) % 3];
		if(rmTri.adjacent[i] != null) {
			rmTri.adjacent[i].adjacent[rmTri.edgeIDinAdjacent[i]] = newTri[i];
		}
		newTri[i].edgeIDinAdjacent[0] = 2;
		newTri[i].edgeIDinAdjacent[1] = rmTri.edgeIDinAdjacent[i];
		newTri[i].edgeIDinAdjacent[2] = 0;
		if(rmTri.adjacent[i] != null) {
			rmTri.adjacent[i].edgeIDinAdjacent[rmTri.edgeIDinAdjacent[i]] = 1;
		}
	}

	// STEP2:
	// スワッピングアルゴリズム（フリップとも呼ばれる）
	// 新しい三角形をスタックに格納
	// スタックが空になるまでスワッピングアルゴリズムを適用

	var stack = [];	// Last In Last Out
	stack.push(newTri[0]);
	stack.push(newTri[1]);
	stack.push(newTri[2]);
	while(stack.length != 0) {
		cdt.DelaunayTriangle.swapping(stack, newPointID, points, constraint);
	}

}

// スワッピングアルゴリズム
// ※cdt.DelaunayTriangleのプロパティとの依存性なし
// 引数 stack: スワッピングアルゴリズムを適用する三角形の参照を格納したスタック
//             後ろから取り出してスワップ処理し，スワップが生じた場合、
//             スワップで生じた2つの三角形を後ろに追加する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
//                  ※省略可能 undefinedで渡されたら拘束なしとみなす
cdt.DelaunayTriangle.swapping = function (stack, newPointID, points, constraint) {

	var tri = stack.pop();	// 対象三角形の参照
	var newPtTri;	// newPointのtriにおけるローカルID
	var oppEdgeTri;	// newPointの対辺のtriにおけるローカルID, opp: opposite
	var adjTri;		// newPointの対辺で隣接する三角形
	var oppEdgeAdj;	// 対辺のadjTriにおけるローカルID
	var farPtAdj;	// triと共有しないadjTriの頂点のローカルID
	var vOpp;		// 対辺のベクトル
	var vFar;		// newPointとfarPointの相対ベクトル

	for(var i = 0; i < 3; ++i) {
		if(tri.vertexID[i] == newPointID) {
			newPtTri = i;
			oppEdgeTri = (newPtTri + 1) % 3
			break;
		}
	}

	// 隣接する三角形を取得
	adjTri = tri.adjacent[oppEdgeTri];
	if(adjTri == null) {
		return;
	}
	oppEdgeAdj = tri.edgeIDinAdjacent[oppEdgeTri];
	farPtAdj = (oppEdgeAdj + 2) % 3;


	// 拘束が引数で与えられなければ空arrayで初期化
	if(constraint == undefined || constraint == null) {
		constraint = [];
	}
	// 対辺が拘束辺ならスワップせず終了
	var p1, p2, c1, c2;
	p1 = tri.vertexID[oppEdgeTri];
	p2 = tri.vertexID[(oppEdgeTri + 1) % 3];
	for(var i = 0; i < constraint.length ; ++i) {
		for(var j = 0; j < constraint[i].length - 1; ++j) {
			c1 = constraint[i][j];
			c2 = constraint[i][j + 1];
			if((p1 == c1 && p2 == c2) || (p1 == c2 && p2 == c1)) {
				return;
			}
		}
	}

	// newPoint が adjTri の外接円に含まれればスワップ
	var c = new cdt.DelaunayTriangle.Circumcircle(
				points[adjTri.vertexID[0]],
				points[adjTri.vertexID[1]],
				points[adjTri.vertexID[2]]
			);
	var swapFlag = (cdt.norm2(cdt.sub(c.p, points[newPointID])) < c.rad);

	// FEMのための要素自動分割」では、以下の3行のようにして
	// 対辺がvFarより短いときスワップを行っているが、
	// ドロネー三角分割にならないことがあるため外接円を使って判定する
	//vOpp=cdt.sub(points[tri.vertexID[(newPtTri+2)%3]], points[tri.vertexID[(newPtTri+1)%3]]);
	//vFar=cdt.sub(points[adjTri.vertexID[farPtAdj]], points[tri.vertexID[newPtTri]]);
	//var swapFlag=(cdt.norm2(vOpp)>cdt.norm2(vFar));

	if(swapFlag) {
		// vertexID の更新
		tri.vertexID[(newPtTri + 2) % 3] = adjTri.vertexID[farPtAdj];
		adjTri.vertexID[(farPtAdj + 2) % 3] = tri.vertexID[newPtTri];
		// adjacent の更新
		tri.adjacent[oppEdgeTri] = adjTri.adjacent[(oppEdgeAdj + 1) % 3];
		adjTri.adjacent[oppEdgeAdj] = tri.adjacent[(oppEdgeTri + 1) % 3];
		tri.adjacent[(oppEdgeTri + 1) % 3] = adjTri;
		adjTri.adjacent[(oppEdgeAdj + 1) % 3] = tri;
		if(tri.adjacent[oppEdgeTri] != null) {
			tri.adjacent[oppEdgeTri].adjacent[adjTri.edgeIDinAdjacent[(oppEdgeAdj + 1) % 3]] = tri;
		}
		if(adjTri.adjacent[oppEdgeAdj] != null) {
			adjTri.adjacent[oppEdgeAdj].adjacent[tri.edgeIDinAdjacent[(oppEdgeTri + 1) % 3]] = adjTri;
		}
		// edgeIDinAdjacent の更新
		tri.edgeIDinAdjacent[oppEdgeTri] = adjTri.edgeIDinAdjacent[(oppEdgeAdj + 1) % 3];
		adjTri.edgeIDinAdjacent[oppEdgeAdj] = tri.edgeIDinAdjacent[(oppEdgeTri + 1) % 3];
		tri.edgeIDinAdjacent[(oppEdgeTri + 1) % 3] = (oppEdgeAdj + 1) % 3;
		adjTri.edgeIDinAdjacent[(oppEdgeAdj + 1) % 3] = (oppEdgeTri + 1) % 3;
		if(tri.adjacent[oppEdgeTri] != null) {
			tri.adjacent[oppEdgeTri].edgeIDinAdjacent[tri.edgeIDinAdjacent[oppEdgeTri]] = oppEdgeTri;
		}
		if(adjTri.adjacent[oppEdgeAdj] != null) {
			adjTri.adjacent[oppEdgeAdj].edgeIDinAdjacent[adjTri.edgeIDinAdjacent[oppEdgeAdj]] = oppEdgeAdj;
		}

		// stackに新しいスワップ対象を追加
		stack.push(tri);
		stack.push(adjTri);
	}
}



// ローソンの探査法
cdt.DelaunayTriangle.lawsonTriangleDetection = function (points, head, newPoint) {
	// head から順にローソンのアルゴリズムを適用していく
	var triTmp = head;
	var edge = 0;
	var vEdge, vPt;
	var isPointInner = false;
	var edgeTmp;
	while(1) {
		isPointInner = true;
		for(var i = 0; i < 3; ++i) {
			vPt = cdt.sub(newPoint, points[triTmp.vertexID[edge]]);
			vEdge = cdt.sub(points[triTmp.vertexID[(edge + 1) % 3]], points[triTmp.vertexID[edge]]);
			// newPointが辺ベクトルの右側にあれば右隣りの三角形に移る
			if(vPt[0] * vEdge[1] - vPt[1] * vEdge[0] > 0) {
				edgeTmp = triTmp.edgeIDinAdjacent[edge];
				triTmp = triTmp.adjacent[edge];
				edge = (edgeTmp + 1) % 3
				isPointInner = false;
				if(triTmp == null) {
					alert("Triangle search failed.");
				}
				break;
			}
			edge = (edge + 1) % 3;
		}
		if(isPointInner) {
			return triTmp;
		}
	}
}



// 外接円クラス
cdt.DelaunayTriangle.Circumcircle = function (p1, p2, p3) {
	var a = cdt.norm2(cdt.sub(p2, p3));
	var b = cdt.norm2(cdt.sub(p3, p1));
	var c = cdt.norm2(cdt.sub(p1, p2));
	var s = (a + b + c) * 0.5;
	this.S = Math.sqrt(s * (s - a) * (s - b) * (s - c));	// area
	this.rad = (a * b * c) / (4.0 * this.S);
	// Calc center
	var tmpv1 = cdt.mul(a * a * (b * b + c * c - a * a), p1);
	var tmpv2 = cdt.mul(b * b * (c * c + a * a - b * b), p2);
	var tmpv3 = cdt.mul(c * c * (a * a + b * b - c * c), p3);
	this.p = cdt.div(cdt.add(cdt.add(tmpv1, tmpv2), tmpv3), 16 * this.S * this.S);
}


//
// utilities for array processing
//

cdt.clone = function (src) {
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
		alert('この処理は未検証 at cdt.clone');
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

cdt.norm2 = function (src) {
	var tmp = 0;
	for(var i = 0; i < src.length; ++i) {
		tmp += src[i] * src[i];
	}
	return Math.sqrt(tmp);
}

// return x-y
cdt.sub = function (x, y) {
	if(x.length != y.length) {
		console.log('length of input arrays are not equal. in cdt.sub');
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
cdt.add = function (x, y) {
	if(x.length != y.length) {
		console.log('ERROR: length of input arrays are not equal. in cdt.sub');
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
cdt.mul = function (x, y) {
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
cdt.div = function (x, y) {
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



// 線分クラス
cdt.LineSeg = function (st, ed) {
	this.start = cdt.clone(st); // start point [x,y]
	this.end = cdt.clone(ed); // end point [x,y]
	this.a = this.end[1] - this.start[1];
	this.b = this.start[0] - this.end[0];
	this.c = (this.end[0] - this.start[0]) * this.start[1]
	- (this.end[1] - this.start[1]) * this.start[0];
	this.vec = cdt.sub(this.end, this.start);
	this.len = cdt.norm2(this.vec);
}
// 線分との交差判定
cdt.LineSeg.prototype.intersect = function (ls) {
	var intersection = false;
	var t1 = ((this.start[0] - this.end[0]) * (ls.start[1] - this.start[1]) + (this.start[1] - this.end[1]) * (this.start[0] - ls.start[0])) *
	((this.start[0] - this.end[0]) * (ls.end[1] - this.start[1]) + (this.start[1] - this.end[1]) * (this.start[0] - ls.end[0]));
	var t2 = ((ls.start[0] - ls.end[0]) * (this.start[1] - ls.start[1]) + (ls.start[1] - ls.end[1]) * (ls.start[0] - this.start[0])) *
	((ls.start[0] - ls.end[0]) * (this.end[1] - ls.start[1]) + (ls.start[1] - ls.end[1]) * (ls.start[0] - this.end[0]));
	if(t1 <= 0 && t2 <= 0) {
		if((this.start[1] - this.end[1]) / (this.start[0] - this.end[0])
		!= (ls.start[1] - ls.end[1]) / (ls.start[0] - ls.end[0])) {
			intersection = true;
		}
	}
	return intersection;
}
// 線分同士の交点の計算
cdt.LineSeg.prototype.crossPos = function (ls) {
	var cross = new Array(2);
	cross[0] = (this.b * ls.c - ls.b * this.c) / (this.a * ls.b - ls.a * this.b);
	cross[1] = (ls.a * this.c - this.a * ls.c) / (this.a * ls.b - ls.a * this.b);
	return cross;
}
// x軸に平行な直線(y=*)との交点のx座標
cdt.LineSeg.prototype.crossXpos = function (y) {
	return (-this.b * y - this.c) / this.a;
}
// y軸に平行な直線(x=*)との交点のx座標
cdt.LineSeg.prototype.crossYpos = function (x) {
	return (-this.a * x - this.c) / this.b;
}
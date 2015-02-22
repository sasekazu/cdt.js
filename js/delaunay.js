// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />


// ドロネー三角形分割関数
// 引数 inputPoints: 入力点の座標 [[x1,y1],[x2,y2],....]
// 引数 ymax, ymin, xmax, xmin: 入力点が含まれる領域の最大・最小座標
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
//                  ※閉境界であるため最後の要素は先頭の要素と一致するようにする
//                    一致しない場合，先頭要素と最後の要素をつなぐ辺も拘束される．
//                  ※省略可能 undefinedで渡されたら拘束なしとみなす
// 返り値：
//    オブジェクト
//    points: 点の座標リスト (inputPointsに加えて点群を内包する大きい三角形の頂点を含む)
//    head: ドロネー三角形クラスの連結リストの先頭への参照
function delaunayTriangulation(inputPoints, ymax, ymin, xmax, xmin, constraint) {

	var points=numeric.clone(inputPoints);	// 点の数 x 2(x,y)
	var cst=numeric.clone(constraint);		// 閉境界 cst[0]=cst[length-1] となるようにする
	if(cst[0]!=cst[cst.length-1]) {
		cst.push(cst[0]);
	}

	// すべての点を内包する
	// 大きい三角形(superTriangle)の頂点を追加
	// 下の点, 上の点1, 上の点2の順
	points.push([(xmax+xmin)*0.5, ymin-(xmax-xmin)*0.5*1.73205080757]);
	points.push([(xmax+xmin)*0.5-(xmax-xmin)*0.5-(ymax-ymin)/1.73205080757, ymax]);
	points.push([(xmax+xmin)*0.5+(xmax-xmin)*0.5+(ymax-ymin)/1.73205080757, ymax]);
	var l=points.length;
	var head=new DelaunayTriangle(points, [l-3, l-2, l-1]);

	// 点を逐次追加する
	// まず点を内包する三角形をローソン探査法で探し
	// その後、スワッピングアルゴリズムを用いて分割
	var resultTri=head;
	for(var i=0; i<points.length-3; ++i) {
		resultTri=DelaunayTriangle.lawsonTriangleDetection(points, resultTri, points[i]);
		resultTri.addPoint(i, points, cst);
	}

	// 辺と閉境界との交差を調べる
	// 総当たりで
	var crossConstraint=[];
	var edgePos=[[0, 0], [0, 0]];	// 辺の始点・終点の座標 [[始点],[終点]]
	var triPos=[[0, 0], [0, 0], [0, 0]];	// 三角形の頂点座標　[[頂点1],[頂点2],[頂点3]]
	var isCross;
	for(var i=0; i<cst.length-1; ++i) {
		edgePos[0]=points[cst[i]];
		edgePos[1]=points[cst[i+1]];
		isCross=false;
		for(var tri=head; tri!=null; tri=tri.next) {
			for(var j=0; j<3; ++j) {
				triPos[j]=points[tri.vertexID[j]];
			}
			for(var j=0; j<3; ++j) {
				if(delaunayTriangulation.isIntersect(edgePos, [triPos[j], triPos[(j+1)%3]])) {
					crossConstraint.push(i);
					isCross=true;
					break;
				}
			}
			if(isCross) {
				break;
			}
		}
	}

	// 交差を解消する

	return { points: points, head: head, crossConstraint: crossConstraint };
}

// 線分の衝突
// 参考: http://marupeke296.com/COL_2D_No10_SegmentAndSegment.html
delaunayTriangulation.isIntersect = function(s1, s2) {
	var v=numeric.sub(s2[0], s1[0]);
	var v1=numeric.sub(s1[1], s1[0]);
	var v2=numeric.sub(s2[1], s2[0]);
	var crs_v1_v2=v1[0]*v2[1]-v1[1]*v2[0];
	if(crs_v1_v2==0.0) {
		return false	// 平行状態
	}
	var crs_v_v1=v[0]*v1[1]-v[1]*v1[0];
	var crs_v_v2=v[0]*v2[1]-v[1]*v2[0];
	var t1=crs_v_v2/crs_v1_v2;
	var t2=crs_v_v1/crs_v1_v2;
	var eps=0.00001;
	// 1点のみを共有する場合は交差とみなさない
	if(t1-eps<=0||t1+eps>=1||t2-eps<=0||t2+eps>=1) {
		return false;	// 交差していない
	} else {
		return true;	// 交差している
	}
}


// ドロネー三角形分割用の三角形クラス
// 引数 points 頂点の座標 [[x1,y1],[x2,y2],......]
// 引数 indices 頂点のインデックス
function DelaunayTriangle(points, indices){
	this.adjacent;			// 隣接する三角形の参照，辺12, 辺23，辺31において隣接する三角形を順に格納する
	this.edgeIDinAdjacent;	// adjacentの各要素と対応．adjacent[i]が隣接する辺ID．辺IDはadjacent側のもの．	
	this.vertexID;			// 三角形の頂点のpoints配列におけるインデックス
	this.prev;	// 双方向連結リストの前ポインタ
	this.next;	// 双方向連結リストの次ポインタ
	this.init(points, indices);
}

// 初期化関数
// コンストラクタとして使う
DelaunayTriangle.prototype.init=function (points, indices) {
	this.adjacent=[null, null, null];
	this.edgeIDinAdjacent=[-1, -1, -1];
	this.vertexID=numeric.clone(indices);
	this.prev=null;
	this.next=null;
	// 頂点が反時計回りになるように並べ替える
	// v1 cross v2 のz座標が負であれば時計回り
	var v1=numeric.sub(points[this.vertexID[1]], points[this.vertexID[0]]);
	var v2=numeric.sub(points[this.vertexID[2]], points[this.vertexID[0]]);
	var tmp;
	if(v1[0]*v2[1]-v1[1]*v2[0]<0) {
		tmp=this.vertexID[1];
		this.vertexID[1]=this.vertexID[2];
		this.vertexID[2]=tmp;
	}
}

// プロパティをコピーする
// 参照のプロパティ以外は値コピー
DelaunayTriangle.prototype.cloneProperties=function () {
	return {
		adjacent: this.adjacent,
		edgeIDinAdjacent: numeric.clone(this.edgeIDinAdjacent),
		vertexID: numeric.clone(this.vertexID),
		prev: this.prev,
		next: this.next
	};
}

// 新しい点を追加して三角形を分割する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
DelaunayTriangle.prototype.addPoint=function (newPointID, points, constraint) {

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
	var newTri=new Array(3);
	for(var i = 0; i < 3; ++i) {
		indices=[newPointID, rmTri.vertexID[i], rmTri.vertexID[(i+1)%3]];
		if(i==0) {
			newTri[i]=this;
			newTri[i].init(points, indices);
		} else {
			newTri[i]=new DelaunayTriangle(points, indices);
		}
	}

	// next の更新
	if(rmTri.prev != null) {
		rmTri.prev.next=newTri[0];
	}
	newTri[0].next=newTri[1];
	newTri[1].next=newTri[2];
	newTri[2].next=rmTri.next;

	// prev の更新
	if(rmTri.next != null) {
		rmTri.next.prev=newTri[2];
	}
	newTri[2].prev=newTri[1];
	newTri[1].prev=newTri[0];
	newTri[0].prev=rmTri.prev;

	// adjacent, edgeIDAdjacent の更新
	// newPointを含む辺では他のnewTriと隣接
	// newPointを含まない辺では,
	// もともとの三角形の隣接三角形と隣接する
	for(var i = 0; i < 3; ++i) {
		newTri[i].adjacent[0]=newTri[(i+2)%3];
		newTri[i].adjacent[1]=rmTri.adjacent[i];
		newTri[i].adjacent[2]=newTri[(i+1)%3];
		if(rmTri.adjacent[i]!=null) {
			rmTri.adjacent[i].adjacent[rmTri.edgeIDinAdjacent[i]]=newTri[i];
		}
		newTri[i].edgeIDinAdjacent[0]=2;
		newTri[i].edgeIDinAdjacent[1]=rmTri.edgeIDinAdjacent[i];
		newTri[i].edgeIDinAdjacent[2]=0;
		if(rmTri.adjacent[i]!=null) {
			rmTri.adjacent[i].edgeIDinAdjacent[rmTri.edgeIDinAdjacent[i]]=1;
		}
	}
	
	// STEP2:
	// スワッピングアルゴリズム（フリップとも呼ばれる）
	// 新しい三角形をスタックに格納
	// スタックが空になるまでスワッピングアルゴリズムを適用

	var stack=[];	// Last In Last Out
	stack.push(newTri[0]);
	stack.push(newTri[1]);
	stack.push(newTri[2]);
	while(stack.length!=0) {
		DelaunayTriangle.swapping(stack, newPointID, points, constraint);
	}

}

// スワッピングアルゴリズム
// ※DelaunayTriangleのプロパティとの依存性なし
// 引数 stack: スワッピングアルゴリズムを適用する三角形の参照を格納したスタック
//             後ろから取り出してスワップ処理し，スワップが生じた場合、
//             スワップで生じた2つの三角形を後ろに追加する
// 引数 newPointID: 追加点のID, pointsの中の何番目の点に該当するかを指す
// 引数 points: 点群の座標 [[x1,y1],[x2,y2],.....]
// 引数 constraint: 閉境界を構成する点のＩＤ[pointID1, pointID2,.... ] 
//                  ※省略可能 undefinedで渡されたら拘束なしとみなす
DelaunayTriangle.swapping=function (stack, newPointID, points, constraint) {

	var tri=stack.pop();	// 対象三角形の参照
	var newPtTri;	// newPointのtriにおけるローカルID
	var oppEdgeTri;	// newPointの対辺のtriにおけるローカルID, opp: opposite
	var adjTri;		// newPointの対辺で隣接する三角形
	var oppEdgeAdj;	// 対辺のadjTriにおけるローカルID
	var farPtAdj;	// triと共有しないadjTriの頂点のローカルID
	var vOpp;		// 対辺のベクトル
	var vFar;		// newPointとfarPointの相対ベクトル

	for(var i=0; i<3; ++i) {
		if(tri.vertexID[i]==newPointID) {
			newPtTri=i;
			oppEdgeTri=(newPtTri+1)%3
			break;
		}
	}

	// 隣接する三角形を取得
	adjTri=tri.adjacent[oppEdgeTri];
	if(adjTri==null) {
		return;
	}
	oppEdgeAdj=tri.edgeIDinAdjacent[oppEdgeTri];
	farPtAdj=(oppEdgeAdj+2)%3;


	// 拘束が引数で与えられなければ空arrayで初期化
	if(constraint==undefined || constraint==null) {
		constraint=[];
	}
	// 対辺が拘束辺ならスワップせず終了
	var p1, p2, c1, c2;
	p1=tri.vertexID[oppEdgeTri];
	p2=tri.vertexID[(oppEdgeTri+1)%3];
	for(var i=0; i<constraint.length-1; ++i) {
		c1=constraint[i];
		c2=constraint[i+1];
		if((p1==c1&&p2==c2)||(p1==c2&&p2==c1)) {
			return;
		}
	}

	// newPoint が adjTri の外接円に含まれればスワップ
	var c=new DelaunayTriangle.Circumcircle(
				points[adjTri.vertexID[0]],
				points[adjTri.vertexID[1]],
				points[adjTri.vertexID[2]]
			);
	var swapFlag=(numeric.norm2(numeric.sub(c.p, points[newPointID]))<c.rad);

	// FEMのための要素自動分割」では、以下の3行のようにして
	// 対辺がvFarより短いときスワップを行っているが、
	// ドロネー三角分割にならないことがあるため外接円を使って判定する
	//vOpp=numeric.sub(points[tri.vertexID[(newPtTri+2)%3]], points[tri.vertexID[(newPtTri+1)%3]]);
	//vFar=numeric.sub(points[adjTri.vertexID[farPtAdj]], points[tri.vertexID[newPtTri]]);
	//var swapFlag=(numeric.norm2(vOpp)>numeric.norm2(vFar));

	if(swapFlag) {
		// vertexID の更新
		tri.vertexID[(newPtTri+2)%3]=adjTri.vertexID[farPtAdj];
		adjTri.vertexID[(farPtAdj+2)%3]=tri.vertexID[newPtTri];
		// adjacent の更新
		tri.adjacent[oppEdgeTri]=adjTri.adjacent[(oppEdgeAdj+1)%3];
		adjTri.adjacent[oppEdgeAdj]=tri.adjacent[(oppEdgeTri+1)%3];
		tri.adjacent[(oppEdgeTri+1)%3]=adjTri;
		adjTri.adjacent[(oppEdgeAdj+1)%3]=tri;
		if(tri.adjacent[oppEdgeTri]!=null) {
			tri.adjacent[oppEdgeTri].adjacent[adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3]]=tri;
		}
		if(adjTri.adjacent[oppEdgeAdj]!=null) {
			adjTri.adjacent[oppEdgeAdj].adjacent[tri.edgeIDinAdjacent[(oppEdgeTri+1)%3]]=adjTri;
		}
		// edgeIDinAdjacent の更新
		tri.edgeIDinAdjacent[oppEdgeTri]=adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3];
		adjTri.edgeIDinAdjacent[oppEdgeAdj]=tri.edgeIDinAdjacent[(oppEdgeTri+1)%3];
		tri.edgeIDinAdjacent[(oppEdgeTri+1)%3]=(oppEdgeAdj+1)%3;
		adjTri.edgeIDinAdjacent[(oppEdgeAdj+1)%3]=(oppEdgeTri+1)%3;
		if(tri.adjacent[oppEdgeTri]!=null) {
			tri.adjacent[oppEdgeTri].edgeIDinAdjacent[tri.edgeIDinAdjacent[oppEdgeTri]]=oppEdgeTri;
		}
		if(adjTri.adjacent[oppEdgeAdj]!=null) {
			adjTri.adjacent[oppEdgeAdj].edgeIDinAdjacent[adjTri.edgeIDinAdjacent[oppEdgeAdj]]=oppEdgeAdj;
		}

		// stackに新しいスワップ対象を追加
		stack.push(tri);
		stack.push(adjTri);
	}
}



// ローソンの探査法
// ※DelaunayTriangleのプロパティとの依存性なし
DelaunayTriangle.lawsonTriangleDetection=function (points, head, newPoint) {
	// head から順にローソンのアルゴリズムを適用していく
	var triTmp=head;
	var edge=0;
	var vEdge, vPt;
	var isPointInner=false;
	var edgeTmp;
	while(1) {
		isPointInner=true;
		for(var i=0; i<3; ++i) {
			vPt=numeric.sub(newPoint, points[triTmp.vertexID[edge]]);
			vEdge=numeric.sub(points[triTmp.vertexID[(edge+1)%3]], points[triTmp.vertexID[edge]]);
			// newPointが辺ベクトルの右側にあれば右隣りの三角形に移る
			if(vPt[0]*vEdge[1]-vPt[1]*vEdge[0]>0) {
				edgeTmp=triTmp.edgeIDinAdjacent[edge];
				triTmp=triTmp.adjacent[edge];
				edge=(edgeTmp+1)%3
				isPointInner=false;
				if(triTmp==null) {
					alert("Triangle search failed.");
				}
				break;
			}
			edge=(edge+1)%3;
		}
		if(isPointInner) {
			return triTmp;
		}
	}
}



// 外接円クラス
DelaunayTriangle.Circumcircle=function(p1, p2, p3) {
	var a=numeric.norm2(numeric.sub(p2, p3));
	var b=numeric.norm2(numeric.sub(p3, p1));
	var c=numeric.norm2(numeric.sub(p1, p2));
	var s=(a+b+c)*0.5;
	this.S=Math.sqrt(s*(s-a)*(s-b)*(s-c));	// area
	this.rad=(a*b*c)/(4.0*this.S);
	// Calc center
	var tmpv1=numeric.mul(a*a*(b*b+c*c-a*a), p1);
	var tmpv2=numeric.mul(b*b*(c*c+a*a-b*b), p2);
	var tmpv3=numeric.mul(c*c*(a*a+b*b-c*c), p3);
	this.p = numeric.div(numeric.add(numeric.add(tmpv1, tmpv2), tmpv3), 16*this.S*this.S);
}


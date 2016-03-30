
var WallDrawer = {};

var selectedLine = null;
var lineMesh = new THREE.Line(new THREE.BoxGeometry(), new THREE.LineBasicMaterial({color: 0xffffff}));
lineMesh.position.y = 0.5;
var addedLines = [];

var getGroundIntersect = function(e, scene) {
  var pos = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * -2 + 1);
  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pos, scene.camera);

  var intersects = raycaster.intersectObject(scene.groundPlane);
  if(intersects.length > 0) {
    return intersects[0];
  } else {
    return null;
  }
}

var updateUI = function(scene) {
  if(selectedLine === null || selectedLine.length < 3) {

    return;
  }

  var shape = new THREE.Shape();
  //shape.autoClose = true;
  shape.moveTo(selectedLine[0].x, selectedLine[0].z);
  selectedLine.forEach(function(pt, i) {
    if(i === 0) return;
    shape.lineTo(selectedLine[i].x, selectedLine[i].z);
  });
  var geom = new THREE.ShapeGeometry(shape);
  lineMesh.geometry = geom;
  lineMesh.geometry.rotateX(Math.PI/2);
}

WallDrawer.initialize = function() {
  addedLines.forEach(function(wall) {
    scene.remove(wall);
  });
  addedLines = [];
  chunk.walls.forEach(function(wall) {
    var shape = new THREE.Shape();
    shape.moveTo(wall[0].x, wall[0].z);
    wall.forEach(function(pt, i) {
      if(i === 0) return;
      shape.lineTo(wall[i].x, wall[i].z);
    });
    var geom = new THREE.ShapeGeometry(shape);
    newMesh.geometry = geom;
    newMesh.geometry.rotateX(Math.PI/2);
    scene.add(newMesh);
    addedLines.push(newMesh);
  }); 
}

WallDrawer.enabled = function(enable, scene) {
  if(enable) {
    scene.add(lineMesh);
  } else {
    scene.remove(lineMesh);
  }
}

// preview vertex insertion/deletion
WallDrawer.mousemove = function(e, scene) {
}

// insert vertex on nearest line, clockwise ordering
WallDrawer.leftclick = function(e, scene) {
  var intersect = getGroundIntersect(e, scene);
  var point = intersect.point;
  if(selectedLine == null) {
    selectedLine = [point];
  } else {
    selectedLine.push(point);
  }
  updateUI(scene);
}

// finish line
WallDrawer.keydown = function(e, scene) {
  if(e.keyCode === 32 || e.keyCode === 13) {
    chunk.walls.push(selectedLine);
    selectedLine = null;
    addedLines.push(lineMesh);
  
    lineMesh = new THREE.Line(new THREE.BoxGeometry(), new THREE.LineBasicMaterial({color: 0xffffff}));
    lineMesh.position.y = 0.5;
    scene.remove(lineMesh);
    scene.add(lineMesh);
    updateUI(scene);
  }
}

module.exports = WallDrawer;

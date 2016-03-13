var chunk = require('../chunk.js');
var ZoneMarker = {};

var states = {IDLE:0, POINT:1, LINE:2};
var currentState = states.IDLE;
var cursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({color:0xadfdfa}));
var activeZone = {x1:0, y1:0, x2:0, y2:0, x3:0, y3:0, active:false};
var previewBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({color: 0x3344cc, transparent: true, opacity: 0.4}));
previewBox.position.y = 0.1;

var distance = function(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2-x1, 2)+Math.pow(y2-y1, 2));
}

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

var updatePreview = function() {
  previewBox.visible = activeZone.active;
  if(!activeZone.active) { return }

  var a = new THREE.Vector2(activeZone.x1, activeZone.y1);
  var b = new THREE.Vector2(activeZone.x2, activeZone.y2);
  var cf = new THREE.Vector2(activeZone.x3, activeZone.y3);

  previewBox.scale.x = Math.max(Math.abs(a.distanceTo(b)), 0.1);
  var n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
  var c1 = new THREE.Vector2().subVectors(cf, b).dot(n);

  previewBox.scale.z = Math.max(Math.abs(c1), 0.1);

  var c = n.multiplyScalar(c1).add(b);
  previewBox.position.x = (a.x + c.x) / 2;
  previewBox.position.z = (a.y + c.y) / 2;

  var angle = new THREE.Vector2().subVectors(b, a).angle();
  previewBox.rotation.y = -angle;
}

ZoneMarker.enabled = function(enable, scene) {
  if(enable) {
    scene.add(cursor);
    scene.add(previewBox);
  } else {
    scene.remove(cursor);
    scene.remove(previewBox);
  }
}

ZoneMarker.mousemove = function(e, scene) {
  var place = getGroundIntersect(e, scene);
  if(place === null) return;
  cursor.position.copy(place.point);
  switch(currentState) {
    case states.IDLE:
      break;
    case states.POINT:
      activeZone.x2 = place.point.x;
      activeZone.y2 = place.point.z;
      activeZone.x3 = place.point.x;
      activeZone.y3 = place.point.z;
      break;
    case states.LINE:
      activeZone.x3 = place.point.x;
      activeZone.y3 = place.point.z;
      break;
  }
  updatePreview();
}

ZoneMarker.leftclick = function(e, scene) {
  var place = getGroundIntersect(e, scene);
  if(place === null) return;
  switch(currentState) {
    case states.IDLE:
      activeZone = {
        x1: place.point.x,
        y1: place.point.z,
        x2: place.point.x,
        y2: place.point.z,
        x3: place.point.x,
        y3: place.point.z
      };
      currentState = states.POINT;
      activeZone.active = true;
      break;
    case states.POINT:
      activeZone.x2 = place.point.x;
      activeZone.y2 = place.point.z;
      activeZone.x3 = place.point.x;
      activeZone.y3 = place.point.z;
      currentState = states.LINE;
      break;
    case states.LINE:
      activeZone.x3 = place.point.x;
      activeZone.y3 = place.point.z;
      currentState = states.IDLE;
      activeZone.active = false;

      var newZone = previewBox.clone();
      scene.add(newZone);
      chunk.zones.push(newZone);
      break;
  }
}

ZoneMarker.rightclick = function(e, scene) {
  currentState = states.IDLE;
  activeZone = {x1:0, y1:0, x2:0, y2:0, x3:0, y3:0, active:false};
}

module.exports = ZoneMarker;

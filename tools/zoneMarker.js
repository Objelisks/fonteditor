const ipc = require('electron').ipcRenderer;
var chunk = require('../chunk.js');
var ZoneMarker = {};

var zoneMaterial = new THREE.MeshStandardMaterial({color: 0x3344cc, transparent: true, opacity: 0.4});

var states = {IDLE:0, POINT:1, LINE:2};
var currentState = states.IDLE;
var cursor = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({color:0xadfdfa}));
var activeZone = {x1:0, y1:0, x2:0, y2:0, x3:0, y3:0, active:false};
var previewBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), zoneMaterial);
previewBox.position.y = 0.1;
var addedZones = [];
var ui = new dat.GUI();
var selectedZone = null;

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

var getObjectIntersect = function(e, scene) {
  var pos = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * -2 + 1);
  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pos, scene.camera);

  var intersects = raycaster.intersectObjects(addedZones);
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

var updateUI = function() {
  if(ui) {
    ui.destroy();
    ui = null;
  }
  if(selectedZone) {
    ui = new dat.GUI();
    ui.add(selectedZone, 'connection').onFinishChange(function(value) {
      ipc.send('open-ghost', value);
    });
    var posFolder = ui.addFolder('position');
    posFolder.add(selectedZone.offsetPosition, 'x');
    posFolder.add(selectedZone.offsetPosition, 'y');
    posFolder.add(selectedZone.offsetPosition, 'z');
    var rotFolder = ui.addFolder('rotation');
    rotFolder.add(selectedZone.offsetRotation, '_x');
    rotFolder.add(selectedZone.offsetRotation, '_y');
    rotFolder.add(selectedZone.offsetRotation, '_z');
  }
}

ZoneMarker.initialize = function(scene) {
  addedZones.forEach(function(zone) {
    scene.remove(zone);
  });
  addedZones = [];
  chunk.zones.forEach(function(zone) {
    var newZone = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), zoneMaterial);
    newZone.position.set(zone.position.x, zone.position.y, zone.position.z);
    newZone.rotation.set(zone.rotation._x, zone.rotation._y, zone.rotation._z);
    newZone.scale.set(zone.scale.x, zone.scale.y, zone.scale.z);
    scene.add(newZone);
    addedZones.push(newZone);
  });
}

ZoneMarker.enabled = function(enable, scene) {
  if(enable) {
    scene.add(cursor);
    scene.add(previewBox);
    updateUI();
    updatePreview();
  } else {
    scene.remove(cursor);
    scene.remove(previewBox);
    if(ui) {
      ui.destroy();
      ui = null;
    }
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
  var zone = getObjectIntersect(e, scene);
  if(zone !== null) {
    selectedZone = zone.object.userData;
    updateUI();
    return;
  }

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
      addedZones.push(newZone);
      scene.add(newZone);
      var zoneData = {
        position: newZone.position,
        rotation: newZone.rotation,
        scale: newZone.scale,
        connection: 'connection',
        offsetPosition: new THREE.Vector3(),
        offsetRotation: new THREE.Euler()
      };
      Object.defineProperty(zoneData, 'editorZone', {value: newZone});
      newZone.userData = zoneData;
      selectedZone = zoneData;
      updateUI();
      chunk.zones.push(zoneData);
      break;
  }
}

ZoneMarker.rightclick = function(e, scene) {
  currentState = states.IDLE;
  activeZone = {x1:0, y1:0, x2:0, y2:0, x3:0, y3:0, active:false};
}

module.exports = ZoneMarker;

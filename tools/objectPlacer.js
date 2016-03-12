var ObjectPlacer = {};

var activeObject = null;
var activeObjectId = 0;

var idText = new THREE.Mesh(new THREE.TextGeometry(), new THREE.MeshStandardMaterial());


ObjectPlacer.enabled = function(enable, scene) {
  if(idText.parent === null) {
    scene.camera.add(idText);
  }

  if(enable) {
    scene.add(idText);
  } else {
    scene.remove(idText);
  }
}

ObjectPlacer.leftclick = function(e, scene) {
  scene.add(activeObject.clone());
}

ObjectPlacer.keydown = function(e, scene) {

}

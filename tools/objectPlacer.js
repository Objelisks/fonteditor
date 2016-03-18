var ObjectPlacer = {};

var activeObject = null;
var activeObjectId = 0;

//var idText = new THREE.Mesh(new THREE.TextGeometry(), new THREE.MeshStandardMaterial());


ObjectPlacer.enabled = function(enable, scene) {
}

ObjectPlacer.leftclick = function(e, scene) {
  scene.add(activeObject.clone());
}

ObjectPlacer.keydown = function(e, scene) {

}

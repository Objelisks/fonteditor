const ipc = require('electron').ipcRenderer;
const tools = require('./tools/tools.js');

var scene, camera, renderer;
var geometry, material, mesh;
var groundPlane;

init();
animate();

var chunk = {
  terrain: null,

};

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.x = 5;
    camera.position.y = 5;
    camera.position.z = 10;
    camera.lookAt(new THREE.Vector3());
    scene.camera = camera;

    geometry = new THREE.BoxGeometry( 1, 1, 1 );
    material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({wireframe: false}));
    groundPlane.rotateX(-Math.PI/2);
    scene.groundPlane = groundPlane;

    scene.add(groundPlane);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

}

function animate() {

    requestAnimationFrame( animate );

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.02;

    renderer.render( scene, camera );

}

/*

qwerty to switch tools

select
  zx to rotate, d to delete, arrow keys to adjust position, a to align to grid
  window for tags
terrain tool
  raycast to plane, draw polygon, simplify
object placement
  raycast to plane, as to cycle, xz to rotate selected
zone placement
  click to start placement, click to confirm length, click to confirm width

*/

var rightMouseHeld = false;

tools['zoneMarker'].enabled(true, scene);

window.addEventListener('mousemove', function(e) {
  tools['zoneMarker'].mousemove(e, scene);

  if(rightMouseHeld) {
    console.log('etc', e.movementX);
    var len = camera.position.length();
    camera.position.applyAxisAngle(camera.up, e.movementX / -100.0);
    camera.position.applyAxisAngle(new THREE.Vector3().copy(camera.position).cross(camera.up), e.movementY / -1000.0);
    camera.position.setLength(len);
    camera.lookAt(new THREE.Vector3(0,0,0));
  }
});

window.addEventListener('wheel', function(e) {
  camera.position.multiplyScalar(1.0 + e.deltaY / 1000.0);
});

window.addEventListener('mousedown', function(e) {
  if(e.button === 0) {
    tools['zoneMarker'].leftclick(e, scene);
  } else if(e.button === 2) {
    rightMouseHeld = true;
  }
});

window.addEventListener('mouseup', function(e) {
  rightMouseHeld = false;
});

window.addEventListener('keydown', function(e) {
  console.log(e);
  if(e.ctrlKey && e.keyCode === 83 && !e.repeat) {
    // ctrl+s pressed
    ipc.send('save', {filename: 'chunk1'});
  }
});

ipc.on('save-done', function(e, file) {
  console.log('saved', file);
});

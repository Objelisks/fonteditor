const ipc = require('electron').ipcRenderer;

var scene, camera, renderer;
var geometry, material, mesh;

init();
animate();

function init() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 1000;

    geometry = new THREE.BoxGeometry( 200, 200, 200 );
    material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

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

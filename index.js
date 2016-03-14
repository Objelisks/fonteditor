const electron = require('electron');
const tools = require('./tools/tools.js');
const stringer = require('json-stringify-pretty-compact');
var ipc = electron.ipcRenderer;
var remote = electron.remote;
var Menu = remote.Menu, MenuItem = remote.MenuItem;

var scene, camera, renderer;
var groundPlane;

init();
animate();

var chunk = require('./chunk.js');

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.x = 5;
    camera.position.y = 5;
    camera.position.z = 10;
    camera.lookAt(new THREE.Vector3());
    scene.camera = camera;

    var ambLight = new THREE.AmbientLight(0x808080);
    scene.add(ambLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5,5,10);
    scene.add(dirLight);

    groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial());
    groundPlane.rotateX(-Math.PI/2);
    groundPlane.updateMatrixWorld(true);
    scene.groundPlane = groundPlane;

    scene.add(new THREE.GridHelper(50, 1));

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

    var toolName = document.createElement('div');
    toolName.classList.add('ui');
    toolName.innerText = 'zoneMarker';
    document.body.appendChild(toolName);

}

function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}

var formatJSON = function(chunk) {
  var obj = {};
  obj.name = chunk.name;
  obj.terrain = chunk.terrain.toJSON();
  obj.grid = chunk.grid;
  obj.zones = chunk.zones;
  obj.objects = chunk.objects;
  return JSON.stringify(obj, null, 2);
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

var activeTool = 'zoneMarker';
var rightMouseHeld = false;

tools[activeTool].enabled(true, scene);

window.addEventListener('mousemove', function(e) {
  tools[activeTool].mousemove(e, scene);

  if(rightMouseHeld) {
    var len = camera.position.length();
    camera.position.applyAxisAngle(camera.up, e.movementX / -100.0);
    camera.position.applyAxisAngle(new THREE.Vector3().copy(camera.position).cross(camera.up), e.movementY / 1000.0);
    camera.position.setLength(len);
    camera.lookAt(new THREE.Vector3(0,0,0));
  }
});

window.addEventListener('wheel', function(e) {
  camera.position.multiplyScalar(1.0 + e.deltaY / 1000.0);
});

window.addEventListener('mousedown', function(e) {
  if(e.button === 0) {
    tools[activeTool].leftclick(e, scene);
  } else if(e.button === 2) {
    tools[activeTool].rightclick(e, scene);
    rightMouseHeld = true;
  }
});

window.addEventListener('mouseup', function(e) {
  rightMouseHeld = false;
});

window.addEventListener('keydown', function(e) {
  if(e.ctrlKey && e.keyCode === 83 && !e.repeat) {
    // ctrl+s pressed
    ipc.send('save', formatJSON(chunk));
  }
});


var menu = Menu.buildFromTemplate([{
  label: 'File',
  submenu: [
    {
      label: 'Open Terrain json',
      click: function() {
        ipc.send('open-file');
      }
    },
    {
      label: 'Save',
      click: function() {
        ipc.send('save', formatJSON(chunk));
      }
    },
    {
      label: 'Toggle Developer Tools',
      click: function(item, focusedWindow) {
        if (focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      }
    }
  ]
}]);
Menu.setApplicationMenu(menu);


var loader = new THREE.JSONLoader();

ipc.on('opened-file', function(e, file) {
  var parsed = loader.parse(JSON.parse(file));
  var convertedMaterials = parsed.materials.map((mat) => {
    var newMat = new THREE.MeshStandardMaterial({color: mat.color, roughness: 1.0, metalness: 0.0});
    newMat.shading = THREE.FlatShading;
    return newMat;
  });
  if(chunk.terrain) {
    scene.remove(chunk.terrain);
  }
  chunk.terrain = new THREE.Mesh(parsed.geometry, new THREE.MultiMaterial(convertedMaterials));
  scene.add(chunk.terrain);
});

ipc.on('save-done', function(e, file) {
  console.log('saved', file);
});

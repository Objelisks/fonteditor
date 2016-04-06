const electron = require('electron');
const tools = require('./tools/tools.js');
const stringer = require('json-stringify-pretty-compact');
var ipc = electron.ipcRenderer;
var remote = electron.remote;
var Menu = remote.Menu, MenuItem = remote.MenuItem;

var scene, camera, renderer;
var groundPlane, toolName;

init();
animate();

var chunk = require('./chunk.js');

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.x = 5;
    camera.position.y = 10;
    camera.position.z = 5;
    camera.lookAt(new THREE.Vector3());
    scene.camera = camera;

    var ambLight = new THREE.AmbientLight(0x808080);
    scene.add(ambLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5,10,5);
    scene.add(dirLight);

    groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshBasicMaterial());
    groundPlane.rotateX(-Math.PI/2);
    groundPlane.updateMatrixWorld(true);
    scene.groundPlane = groundPlane;

    scene.add(new THREE.GridHelper(50, 1));

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    document.body.appendChild( renderer.domElement );

    toolName = document.createElement('div');
    toolName.classList.add('ui');
    toolName.style.top = '10px';
    toolName.style.left = '10px';
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
  obj.zones = chunk.zones;
  obj.objects = chunk.objects;
  obj.walls = chunk.walls;
  return JSON.stringify(obj, null, 2);
}

var save = function() {
  ipc.send('save', formatJSON(chunk), chunk.name);
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
tools[activeTool].enabled(true, scene);

var rightMouseHeld = false;

var handleToolAction = function(action, ...args) {
  var tool = tools[activeTool];
  if(tool[action] !== undefined) {
      tool[action].call(tool, ...args);
  }
}

window.addEventListener('mousemove', function(e) {
  handleToolAction('mousemove', e, scene);
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
    handleToolAction('leftclick', e, scene);
  } else if(e.button === 2) {
    handleToolAction('rightclick', e, scene);
    rightMouseHeld = true;
  }
});

window.addEventListener('mouseup', function(e) {
  rightMouseHeld = false;
  handleToolAction('mouseup', e, scene);
});

window.addEventListener('keydown', function(e) {
  handleToolAction('keydown', e, scene);
  if(e.ctrlKey && e.keyCode === 83 && !e.repeat) {
    // ctrl+s pressed, send save signal
    save();
  }
  if(e.keyCode === 81 && !e.repeat) {
    // tab pressed, cycle through tools
    handleToolAction('enabled', false, scene);
    var toolNames = Object.keys(tools);
    var currentIndex = toolNames.indexOf(activeTool);
    activeTool = toolNames[(currentIndex + 1) % toolNames.length];
    toolName.innerText = activeTool;
    handleToolAction('enabled', true, scene);
  }
});

window.addEventListener('keyup', function(e) {
  handleToolAction('keyup', e, scene);
});


var menu = Menu.buildFromTemplate([{
  label: 'File',
  submenu: [
    {
      label: 'Open existing chunk json',
      click: function() {
        ipc.send('open-file', 'opened-chunk');
      }
    },
    {
      label: 'Open Terrain json',
      click: function() {
        ipc.send('open-file', 'opened-terrain');
      }
    },
    {
      label: 'Save',
      click: function() {
        save();
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

ipc.on('opened-terrain', function(e, file) {
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

var objLoader = new THREE.ObjectLoader();

ipc.on('opened-chunk', function(e, file) {
  var json = JSON.parse(file);
  chunk.name = json.name;
  chunk.terrain = objLoader.parse(json.terrain);
  scene.add(chunk.terrain);
  chunk.grid = json.grid;
  chunk.zones = json.zones;
  tools['zoneMarker'].initialize(scene);
  chunk.walls = json.walls;
  tools['wallDrawer'].initialize(scene);
  chunk.objects = json.objects;
});

ipc.on('save-done', function(e, file) {
  console.log('saved', file);
});

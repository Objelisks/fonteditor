const electron = require('electron');
const fs = require('fs');
var app = electron.app;
var ipc = electron.ipcMain;
var dialog = electron.dialog;
var mainWindow = null;

app.on('window-all-closed', function() {
  console.log('goodbye');
  app.quit();
});

app.on('ready', function() {
  mainWindow = new electron.BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL(`file://${__dirname}/index.html`);
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});


ipc.on('open-file', function(e, type) {
  dialog.showOpenDialog({title: 'grab em file', properties: ['openFile']}, function(filenames) {
    var filepath = filenames[0];
    fs.readFile(filepath, 'utf-8', (err, data) => {
      e.sender.send(type, data);
    });
  });
});

ipc.on('save', function(e, arg, name) {
  var filename = name || 'chunk-temp.json';
  fs.writeFile(filename, arg, function() {
    e.sender.send('save-done', filename);
  });
});

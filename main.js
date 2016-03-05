const electron = require('electron');
const fs = require('fs');
var app = electron.app;
var ipc = electron.ipcMain;
var mainWindow = null;

fs.mkdir('output');

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


ipc.on('save', function(e, arg) {
  var filename = arg.filename;
  fs.writeFile(filename, JSON.stringify(arg), function() {
    e.sender.send('save-done', filename);
  });
});

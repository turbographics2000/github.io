const {app, BrowserWindow} = require('electron');
let previewWindow;

app.on('ready', _ => {
    previewWindow = new BrowserWindow({ 
        width: 600, 
        height: 500 
    });
    previewWindow.loadURL('file://' + __dirname + '/test.html');
    previewWindow.on('closed', _ => {
        previewWindow = null;
    });
});

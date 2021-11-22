const {app, BrowserWindow, ipcMain, dialog} = require('electron')

let mainWindow;
async function createWindow(){
    mainWindow = new BrowserWindow({
        width: 1510,
        height: 1000,
        icon: 'rsc/icon.ico',
        webPreferences: {
            nativeWindowOpen: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            contextIsolation: false
        }
    })

    mainWindow.loadFile('index.html');
    mainWindow.webContents.once('dom-ready',()=>{
        mainWindow.show();
        mainWindow.center();
        mainWindow.webContents.openDevTools();
    })
}

app.whenReady().then(createWindow);

app.on('window-all-closed', ()=> {if(process.platform != 'darwin') app.quit()});
app.on('activate', ()=>{if(BrowserWindow.getAllWindows().length === 0) createWindow()})

ipcMain.on("send-alert", (event, incomingMessage) => {
    const options = {
        type: "none",
        buttons: ["Okay"],
        title: "Alert!",
        message: incomingMessage
    }
    dialog.showMessageBox(mainWindow, options)
})
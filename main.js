const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let overlayWindow;

// メイン設定ウィンドウ
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: true,
    resizable: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
  
  // メインウィンドウを閉じたら全て終了
  mainWindow.on('closed', () => {
    // オーバーレイウィンドウも閉じる
    if (overlayWindow) {
      overlayWindow.close();
    }
    mainWindow = null;
    // アプリ全体を終了
    app.quit();
  });
}

// オーバーレイウィンドウ
function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 70,
    height: 60,
    x: 10,
    y: 100,
    icon: path.join(__dirname, 'icon.png'),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  overlayWindow.loadFile('overlay.html');
  
  // マウス操作を透過しない（移動できるように）
  overlayWindow.setIgnoreMouseEvents(false);
  
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // ページ読み込み完了を待つ
  overlayWindow.webContents.on('did-finish-load', () => {
    console.log('オーバーレイウィンドウの読み込み完了');
  });
}

// グローバルホットキーの登録
function registerHotkeys() {
  console.log('ホットキーを登録中...');
  
  // 敵のフラッシュ使用 (Shift+1~5)
  const enemyKeys = [
    { key: 'Shift+1', role: 'top' },
    { key: 'Shift+2', role: 'jungle' },
    { key: 'Shift+3', role: 'mid' },
    { key: 'Shift+4', role: 'adc' },
    { key: 'Shift+5', role: 'support' }
  ];

  enemyKeys.forEach(({ key, role }) => {
    const success = globalShortcut.register(key, () => {
      console.log(`${key} が押されました (敵 ${role})`);
      const data = { team: 'enemy', role: role };
      
      // オーバーレイにイベント送信
      if (overlayWindow && overlayWindow.webContents) {
        console.log(`オーバーレイにイベント送信: ${JSON.stringify(data)}`);
        overlayWindow.webContents.send('flash-used', data);
      } else {
        console.log('エラー: オーバーレイウィンドウが存在しません');
      }
      
      // メインウィンドウにもイベント送信
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('flash-used', data);
      }
    });
    console.log(`${key} 登録: ${success ? '成功' : '失敗'}`);
  });

  // タイマーリセット (Ctrl+1~5)
  const resetKeys = [
    { key: 'Ctrl+1', role: 'top' },
    { key: 'Ctrl+2', role: 'jungle' },
    { key: 'Ctrl+3', role: 'mid' },
    { key: 'Ctrl+4', role: 'adc' },
    { key: 'Ctrl+5', role: 'support' }
  ];

  resetKeys.forEach(({ key, role }) => {
    const success = globalShortcut.register(key, () => {
      console.log(`${key} が押されました (タイマーリセット ${role})`);
      const data = { team: 'enemy', role: role };
      
      // オーバーレイにリセットイベント送信
      if (overlayWindow && overlayWindow.webContents) {
        console.log(`オーバーレイにリセットイベント送信: ${JSON.stringify(data)}`);
        overlayWindow.webContents.send('flash-reset', data);
      } else {
        console.log('エラー: オーバーレイウィンドウが存在しません');
      }
      
      // メインウィンドウにもイベント送信
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('flash-reset', data);
      }
    });
    console.log(`${key} 登録: ${success ? '成功' : '失敗'}`);
  });
}

// アプリ起動
app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();
  
  // ウィンドウ読み込み完了を待ってからホットキー登録
  setTimeout(() => {
    registerHotkeys();
    console.log('全ての初期化が完了しました');
  }, 2000);
});

// 全ウィンドウを閉じたら終了
app.on('window-all-closed', () => {
  app.quit();
});

// macOSでアクティブ化
app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
  if (overlayWindow === null) {
    createOverlayWindow();
  }
});

// アプリ終了時にホットキー解除
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPCイベント: ルーム情報の受信
ipcMain.on('room-joined', (event, roomId) => {
  console.log(`メインプロセス: ルーム参加 - ${roomId}`);
  if (overlayWindow && overlayWindow.webContents) {
    overlayWindow.webContents.send('room-joined', roomId);
  }
});
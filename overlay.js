console.log('=== overlay.js 読み込み開始 ===');

const { ipcRenderer } = require('electron');

console.log('ipcRenderer:', ipcRenderer);

// Firebaseは後で初期化
let FirebaseManager;
let firebase;

try {
  FirebaseManager = require('./firebase.js');
  firebase = new FirebaseManager();
  firebase.initialize();
  console.log('Firebase初期化完了');
} catch (error) {
  console.error('Firebase初期化エラー:', error);
}

const roles = ['top', 'jungle', 'mid', 'adc', 'support'];

// タイマーの状態を保持（敵チームのみ）
const timers = {};

// 初期化
roles.forEach(role => {
  timers[`enemy_${role}`] = {
    usedAt: null,
    cooldown: 300000
  };
});

console.log('タイマー初期化完了');

// キー入力イベントを受信（フラッシュ使用）
ipcRenderer.on('flash-used', (event, data) => {
  console.log('★★★ flash-used イベント受信！★★★');
  console.log('データ:', data);
  
  const { team, role } = data;
  
  // 敵チームのみ処理
  if (team !== 'enemy') return;
  
  // すぐにローカル表示を更新
  const key = `${team}_${role}`;
  timers[key] = {
    usedAt: Date.now(),
    cooldown: 300000
  };
  
  console.log(`タイマー設定: ${key}`, timers[key]);
  updateDisplay();
  
  // Firebaseにも記録
  if (firebase && firebase.currentRoom) {
    console.log(`Firebase に記録: ${team}_${role}`);
    firebase.recordFlash(team, role);
  } else {
    console.log('警告: ルームに参加していません（Firebaseには記録されません）');
  }
});

console.log('ipcRenderer.on("flash-used") 登録完了');

// キー入力イベントを受信（タイマーリセット）
ipcRenderer.on('flash-reset', (event, data) => {
  console.log('★★★ flash-reset イベント受信！★★★');
  console.log('データ:', data);
  
  const { team, role } = data;
  
  // 敵チームのみ処理
  if (team !== 'enemy') return;
  
  // タイマーをリセット
  const key = `${team}_${role}`;
  timers[key] = {
    usedAt: null,
    cooldown: 300000
  };
  
  console.log(`タイマーリセット: ${key}`);
  updateDisplay();
  
  // Firebaseからも削除
  if (firebase && firebase.currentRoom) {
    console.log(`Firebase からタイマー削除: ${team}_${role}`);
    const { ref, remove } = require('firebase/database');
    const timerRef = ref(firebase.database, `rooms/${firebase.currentRoom}/timers/${key}`);
    remove(timerRef);
  }
});

console.log('ipcRenderer.on("flash-reset") 登録完了');

// ルーム参加イベントを受信
ipcRenderer.on('room-joined', (event, roomId) => {
  console.log(`ルーム参加イベント受信: ${roomId}`);
  if (firebase) {
    firebase.currentRoom = roomId;
    firebase.watchTimers(roomId);
  }
});

// タイマー更新イベント（Firebaseから）
window.addEventListener('timers-updated', (event) => {
  console.log('Firebase からタイマー更新を受信');
  const updatedTimers = event.detail;
  
  Object.entries(updatedTimers).forEach(([key, timer]) => {
    if (key.startsWith('enemy_')) {
      timers[key] = timer;
    }
  });
  
  updateDisplay();
});

// 表示を更新
function updateDisplay() {
  roles.forEach(role => {
    const key = `enemy_${role}`;
    const element = document.getElementById(key);
    
    if (!element) {
      console.error(`要素が見つかりません: ${key}`);
      return;
    }
    
    const timer = timers[key];
    
    if (!timer || !timer.usedAt) {
      // フラッシュが使用可能
      element.textContent = 'OK ✅';
      element.className = 'status ready';
    } else {
      // クールダウン計算
      const now = Date.now();
      const elapsed = now - timer.usedAt;
      const remaining = timer.cooldown - elapsed;
      
      if (remaining <= 0) {
        // クールダウン終了
        element.textContent = 'OK ✅';
        element.className = 'status ready';
      } else {
        // クールダウン中
        const seconds = Math.ceil(remaining / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeString = `${minutes}:${secs.toString().padStart(2, '0')}`;
        
        element.textContent = `F: ${timeString}`;
        
        // 残り時間に応じて色を変更
        if (remaining <= 30000) {
          element.className = 'status soon';
        } else {
          element.className = 'status cooldown';
        }
      }
    }
  });
}

// 1秒ごとに表示を更新
setInterval(() => {
  updateDisplay();
}, 1000);

// 初期表示
updateDisplay();

console.log('=== overlay.js セットアップ完了 ===');
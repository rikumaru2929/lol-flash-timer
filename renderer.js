const { ipcRenderer } = require('electron');
const FirebaseManager = require('./firebase.js');

const firebase = new FirebaseManager();
firebase.initialize();

let currentUserName = '';

// DOM要素
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomId');
const joinRoomBtn = document.getElementById('joinRoom');
const createRoomBtn = document.getElementById('createRoom');
const connectionStatus = document.getElementById('connectionStatus');
const currentRoomDisplay = document.getElementById('currentRoom');
const memberList = document.getElementById('memberList');

// ルームに参加
joinRoomBtn.addEventListener('click', () => {
  const roomId = roomIdInput.value.trim().toUpperCase();
  const playerName = playerNameInput.value.trim();
  
  if (!roomId) {
    alert('ルームIDを入力してください');
    return;
  }

  if (!playerName) {
    alert('プレイヤー名を入力してください');
    return;
  }

  currentUserName = playerName;

  try {
    firebase.joinRoom(roomId, currentUserName);
    updateConnectionStatus(true, roomId);
    ipcRenderer.send('room-joined', roomId);
  } catch (error) {
    console.error('ルーム参加エラー:', error);
    alert('ルームに参加できませんでした');
  }
});

// 新規ルーム作成
createRoomBtn.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();

  if (!playerName) {
    alert('プレイヤー名を入力してください');
    return;
  }

  currentUserName = playerName;

  try {
    const roomId = firebase.createRoom(currentUserName);
    roomIdInput.value = roomId;
    updateConnectionStatus(true, roomId);
    ipcRenderer.send('room-joined', roomId);
    
    // ルームIDをクリップボードにコピー
    navigator.clipboard.writeText(roomId);
    alert(`ルームID: ${roomId} をクリップボードにコピーしました`);
  } catch (error) {
    console.error('ルーム作成エラー:', error);
    alert('ルームを作成できませんでした');
  }
});

// 接続状態の更新
function updateConnectionStatus(connected, roomId) {
  if (connected) {
    connectionStatus.textContent = '接続中';
    connectionStatus.style.color = '#4CAF50';
    currentRoomDisplay.textContent = `現在のルーム: ${roomId}`;
  } else {
    connectionStatus.textContent = '未接続';
    connectionStatus.style.color = '#F44336';
    currentRoomDisplay.textContent = '';
  }
}

// メンバーリストの更新
window.addEventListener('members-updated', (event) => {
  const members = event.detail;
  memberList.innerHTML = '';
  
  Object.entries(members).forEach(([userId, member]) => {
    const li = document.createElement('li');
    li.textContent = member.name;
    if (userId === firebase.userId) {
      li.textContent += ' (You)';
      li.style.fontWeight = 'bold';
    }
    memberList.appendChild(li);
  });
});

// アプリ終了時の処理
window.addEventListener('beforeunload', () => {
  firebase.leaveRoom();
});
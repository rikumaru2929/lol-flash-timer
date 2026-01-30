const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, onValue, remove } = require('firebase/database');

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyAcl7mx6u7X9OIh47XKyu2yufk_UZhRGPg",
  authDomain: "lol-flash-timer.firebaseapp.com",
  databaseURL: "https://lol-flash-timer-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lol-flash-timer",
  storageBucket: "lol-flash-timer.firebasestorage.app",
  messagingSenderId: "139511445467",
  appId: "1:139511445467:web:b0cb6e4a8036447e1799fe",
  measurementId: "G-F470Z277T1"
};

class FirebaseManager {
  constructor() {
    this.app = null;
    this.database = null;
    this.currentRoom = null;
    this.userId = this.generateUserId();
  }

  // ユーザーIDを生成
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  // Firebase初期化
  initialize() {
    if (!this.app) {
      this.app = initializeApp(firebaseConfig);
      this.database = getDatabase(this.app);
    }
  }

  // ルームに参加
  joinRoom(roomId, userName) {
    this.currentRoom = roomId;
    
    // メンバー情報を登録
    const memberRef = ref(this.database, `rooms/${roomId}/members/${this.userId}`);
    set(memberRef, {
      name: userName,
      online: true,
      joinedAt: Date.now()
    });

    // メンバーリストの監視
    this.watchMembers(roomId);
    
    // タイマーの監視
    this.watchTimers(roomId);

    return roomId;
  }

  // 新しいルームを作成
  createRoom(userName) {
    const roomId = this.generateRoomId();
    return this.joinRoom(roomId, userName);
  }

  // ルームIDを生成
  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // フラッシュ使用を記録
  recordFlash(team, role) {
    if (!this.currentRoom) return;

    const timerRef = ref(this.database, `rooms/${this.currentRoom}/timers/${team}_${role}`);
    set(timerRef, {
      usedAt: Date.now(),
      cooldown: 300000, // 5分 = 300秒
      usedBy: this.userId
    });
  }

  // タイマーの監視
  watchTimers(roomId) {
    const timersRef = ref(this.database, `rooms/${roomId}/timers`);
    onValue(timersRef, (snapshot) => {
      const timers = snapshot.val();
      if (timers && typeof window !== 'undefined') {
        // レンダラープロセスにタイマー更新を通知
        window.dispatchEvent(new CustomEvent('timers-updated', { detail: timers }));
      }
    });
  }

  // メンバーの監視
  watchMembers(roomId) {
    const membersRef = ref(this.database, `rooms/${roomId}/members`);
    onValue(membersRef, (snapshot) => {
      const members = snapshot.val();
      if (members && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('members-updated', { detail: members }));
      }
    });
  }

  // ルームから退出
  leaveRoom() {
    if (!this.currentRoom) return;

    const memberRef = ref(this.database, `rooms/${this.currentRoom}/members/${this.userId}`);
    remove(memberRef);
    
    this.currentRoom = null;
  }

  // 全タイマーをリセット
  resetAllTimers() {
    if (!this.currentRoom) return;

    const timersRef = ref(this.database, `rooms/${this.currentRoom}/timers`);
    remove(timersRef);
  }
}

module.exports = FirebaseManager;
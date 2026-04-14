/* ================================================
   config.js - Firebase Configuration
   Firebase에서 발급받은 설정값을 여기에 붙여넣으세요.
   ================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDFkTUa-lHBRttLIMVbLSiEOjAoYMUPyFU",
  authDomain: "anitalk-manager.firebaseapp.com",
  projectId: "anitalk-manager",
  storageBucket: "anitalk-manager.firebasestorage.app",
  messagingSenderId: "988646593817",
  appId: "1:988646593817:web:f28839d00c51e8ff382188"
};

// Vercel 배포 환경이 아닌 로컬 테스트용 (선택)
if (typeof module !== 'undefined') {
  module.exports = firebaseConfig;
}

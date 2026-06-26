const firebaseConfig = {
  apiKey: "AIzaSyDCEBeJNictNaemiTqq2-XU-qmm3sX31ho",
  authDomain: "controle-de-estudos-9c375.firebaseapp.com",
  projectId: "controle-de-estudos-9c375",
  storageBucket: "controle-de-estudos-9c375.firebasestorage.app",
  messagingSenderId: "226617802425",
  appId: "1:226617802425:web:0a1c5bfa152e19aed3a568",
  measurementId: "G-F9THBXWNSQ"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
const firebaseConfig = {
  apiKey: "AIzaSyClH5mG7H_Lu3UJ8dJY8PGn4Q6SkF2MLXc",
  authDomain: "salt-fac41.firebaseapp.com",
  projectId: "salt-fac41",
  storageBucket: "salt-fac41.firebasestorage.app",
  messagingSenderId: "602776290115",
  appId: "1:602776290115:web:7b8e38616cfafcb5cb25f6",
  measurementId: "G-FQZNQ5J5LW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

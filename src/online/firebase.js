import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyCtGgYadr3U9pV3pKhM8Z-0QMURc2fmPlA",
  authDomain: "mafiagame-401bb.firebaseapp.com",
  databaseURL: "https://mafiagame-401bb-default-rtdb.firebaseio.com",
  projectId: "mafiagame-401bb",
  storageBucket: "mafiagame-401bb.firebasestorage.app",
  messagingSenderId: "557392490097",
  appId: "1:557392490097:web:8651981af45ca46730b5d0",
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db }
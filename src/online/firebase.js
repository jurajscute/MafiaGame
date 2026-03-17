// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCtGgYadr3U9pV3pKhM8Z-0QMURc2fmPlA",
  authDomain: "mafiagame-401bb.firebaseapp.com",
  projectId: "mafiagame-401bb",
  storageBucket: "mafiagame-401bb.firebasestorage.app",
  messagingSenderId: "557392490097",
  appId: "1:557392490097:web:8651981af45ca46730b5d0",
  measurementId: "G-3FS8FN1YRH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
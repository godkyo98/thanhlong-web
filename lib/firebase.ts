// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyAsZBUf4w9jjEqgnWzs3uTKoJr5Vbo6UCM",
	authDomain: "thanh-long-tournament.firebaseapp.com",
	projectId: "thanh-long-tournament",
	storageBucket: "thanh-long-tournament.firebasestorage.app",
	messagingSenderId: "643834521904",
	appId: "1:643834521904:web:639179fe46580a408300f5"
};

// Đảm bảo không khởi tạo lại Firebase nhiều lần khi chuyển trang
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
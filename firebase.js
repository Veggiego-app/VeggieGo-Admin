// 🔥 FIREBASE IMPORTS

import {

    initializeApp

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {

    getFirestore

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {

    getAuth

}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
    getStorage
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"

// 🔥 FIREBASE CONFIG

const firebaseConfig = {
  apiKey: "AIzaSyCGxua4ApZbRdYP1wA6e8b4AwvqdKxrZVc",
  authDomain: "veggie-go-98215.firebaseapp.com",
  projectId: "veggie-go-98215",
  storageBucket: "veggie-go-98215.firebasestorage.app",
  messagingSenderId: "472084397101",
  appId: "1:472084397101:web:297e14252e111e597b0ca4",
  measurementId: "G-GZC71F8RB9"
};

// 🔥 INIT

const app =
    initializeApp(
        firebaseConfig
    )

console.log(
    "PROJECT ID = ",
    app.options.projectId
)

// 🔥 FIRESTORE

const db =
    getFirestore(app)

const auth =
    getAuth(app)

const storage =
    getStorage(app)

export { app }

// 🔥 EXPORT
console.log(
    "PROJECT NUMBER =",
    app.options.messagingSenderId
)

console.log(
    "PROJECT ID =",
    app.options.projectId
)

export {

    db,

    auth,

    storage

}
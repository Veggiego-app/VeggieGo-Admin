import {
auth
}
from "./firebase.js"

import {
signInWithEmailAndPassword
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

document
.getElementById(
"loginBtn"
)
.addEventListener(
"click",
async ()=>{

const email =
document.getElementById(
"email"
).value

const password =
document.getElementById(
"password"
).value

try{

await signInWithEmailAndPassword(
    auth,
    email,
    password
)

const user =
    auth.currentUser

const adminEmails = [

    "support@veggiego.co.in"

]

if (

    !adminEmails.includes(
        user.email
    )

) {

    alert(
        "Access Denied"
    )

    await auth.signOut()

    return

}

window.location.href =
    "index.html"

}
catch(error){

console.log(error)

alert(
JSON.stringify(error)
)

}

})
document
.getElementById("password")
.addEventListener(
    "keypress",
    (e) => {

        if (
            e.key === "Enter"
        ) {

            document
            .getElementById(
                "loginBtn"
            )
            .click()

        }

    }
)
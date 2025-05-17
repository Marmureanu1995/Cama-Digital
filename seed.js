const Firebase = require('firebase');
var environment = require('./env/firebase.json');



require('firebase/firestore');
require('firebase/auth');

const firebaseConfig = {
    ...environment
}

Firebase.initializeApp(firebaseConfig);

const db = Firebase.firestore();

const seed = async () => {

    const users = [
        {
            username: "newAdmin",
            name: "Admin",
            lastName: "",
            email: 'admin@admin.com',
            password: 'admin123',
            role: "Super Admin",
            isActive: true,
            superAdmin: true,

        }]

    for (let user of users) {
        try {
            const user1 = await Firebase.auth().createUserWithEmailAndPassword(user.email, user.password);
            console.log(user1.user.uid)
            const u = await db.collection("users").doc(user1.user.uid).set({
                email: user.email,
                uid: user1.user.uid,
                id: user1.user.uid,
                active: true,
                companyID: user1.user.uid,
                confirmPass: user.password,
                pass: user.password,
                firstName: user.name,
                lastName: user.lastName,
                path: "",
                pic: "",
                role: user.role,
                appId: 4368,
                appPassword: "LErscg",
                username: user.username,
                playlist: true,
                media: true,
                channel: true,
            })
            const t = await db.collection("users").doc(user1.user.uid).get()
            console.log(t.data());
            await db.collection("restaurants").doc(user1.user.uid).set({
                name: user.name,
                id: user1.user.uid,
                active: true,
                email: user.email,
                uid: user1.user.uid,
                pass: user.password,
                confirmPass: user.password,
                isActive: true,
                path: "",
                picURL: "",
                playerLimit: 999,
                superAdmin: user.superAdmin,
                username: user.username,
                companyExpireDate: "2099-04-01",
            })
        }
        catch (e) {
            console.log(e)
        }
        finally {
            console.log("done");
            process.exit();

        }
    }

}

seed();
const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
const cors = require("cors");
const admin = require("firebase-admin");
require("dotenv").config();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// middle wire
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8g1rh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer")) {
    const token = req.headers.authorization.split("")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      console.log("Gain", decodedUser);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appoinmentCollection = database.collection("appoinments");
    const userCollection = database.collection("users");
    app.get("/appoinments", async (req, res) => {
      const email = req.query.email;
      const date = req.query.date;
      console.log(date);
      const quary = { email: email, date: date };
      console.log(quary);
      const cursor = appoinmentCollection.find(quary);
      const appoinments = await cursor.toArray();
      res.send(appoinments);
    });

    app.post("/appoinments", async (req, res) => {
      const appoinment = req.body;
      const result = await appoinmentCollection.insertOne(appoinment);
      console.log(result);
      res.json(result);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const quary = { email: email };
      const user = await userCollection.findOne(quary);
      let isAddmin = false;
      if (user?.role === "addmin") {
        isAddmin = true;
      }
      res.json({ addmin: isAddmin });
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log("new user", user);

      const result = await userCollection.insertOne(user);
      res.json(result);
    });
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      // console.log("put2", user);

      console.log("put", req.body.email);
      // console.log("put", req.decodedEmail);
      const filter = { email: user.email };
      const updateDoc = { $set: { role: "addmin" } };
      const result = await userCollection.updateOne(filter, updateDoc);
      console.log(result);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctor PORTAL");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});


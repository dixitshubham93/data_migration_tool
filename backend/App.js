import express from "express";
import mongoose from "mongoose";
const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "text/plain" }));

app.get("/", (req, res) => {
  res.send("<h1>listening started</h1>");
});
const flexibleSchema = new mongoose.Schema({}, { strict: false });

const MyCollection = mongoose.model('MyCollection', flexibleSchema, 'comments');

MyCollection.find({name : "Taylor Scott"})
  .then(docs => {
    console.log(docs);
  })
  .catch(err => {
    console.error('Error retrieving documents', err);
  });

export { app };

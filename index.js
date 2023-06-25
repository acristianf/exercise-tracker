require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");

const client = new MongoClient(process.env.MONGO_URI);
async function start() {
	try {
		await client.connect();
	} catch (e) {
		console.log(`Error connecting to databade. ${e}`);
		process.exit(1);
	}
}
start();

const db = client.db("exercise-tracke")
const users = db.collection("users");
const exercises = db.collection("exercises");

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
	res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/users", async (_, res) => {
	const docs = await users.find().toArray();
	res.send(docs);
})

app.get("/api/users/:_id/logs?", async (req, res) => {
	const id = new ObjectId(req.params._id);
	const found = await users.findOne({ _id: id });
	if (!found) {
		res
			.status(400)
			.json({
				error: "User not found"
			})
	} else {
		const limit = req.query.limit || 10;
		const from = req.query.from ? new Date(req.query.from) : new Date(0);
		const to = req.query.to ? new Date(req.query.to) : new Date();
		const exercisesCursor = exercises
			.find({
				username: found["username"],
				date: { $gte: from, $lt: to },
			})
			.project({ username: 0, _id: 0 })
			.limit(limit);
		const logs = await exercisesCursor.toArray();
		logs.forEach(log => {
			log["date"] = log["date"].toDateString()
		});
		res.json({
			username: found["username"],
			count: logs.length,
			_id: id,
			logs: logs
		})
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const username = req.body["username"];
		const result = await users.findOne({ username: username });
		if (!result) {
			const inserted = await users.insertOne({
				username: username
			});
			res.json({
				username: username,
				_id: inserted["insertedId"]
			});
		} else {
			res.json(result);
		};
	} catch (e) {
		console.log("Error: " + e);
		process.exit(1);
	}
});

app.post("/api/users/:_id/exercises", async (req, res) => {
	try {
		const id = new ObjectId(req.params._id);
		const result = await users.findOne({ _id: id });
		if (result) {
			let date = req.body["date"] ? new Date(req.body["date"]) : new Date();
			if (isNaN(date)) {
				res.status(400).json({ error: "Invalid Date" });
			};
			let { description, duration } = req.body;
			duration = new Number(duration);
			if (isNaN(duration)) {
				res.status(401).json({ error: "Invalid Duration" });
			};
			const inserted = await exercises.insertOne({
				username: result["username"],
				description: description,
				duration: duration,
				date: date
			});
			res.json({
				username: result["username"],
				description: description,
				duration: duration,
				date: date.toDateString(),
				_id: inserted["insertedId"]
			});
		} else {
			res
				.status(402)
				.json({
					error: `user not found with id ${id}`
				})
		}
	} catch (e) {
		console.log("Error: " + e);
		process.exit(1);
	}
});

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

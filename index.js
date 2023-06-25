require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

mongoose.connect(process.env.MONGO_URI);

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true
	}
});
const exerciseSchema = new mongoose.Schema({
	user_id: { type: String, required: true },
	description: {
		type: String,
		required: true
	},
	duration: {
		type: Number,
		required: true
	},
	date: {
		type: Date,
		required: true
	}
});
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

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
	const docs = await User.find();
	res.send(docs);
})

app.get("/api/users/:_id/logs", async (req, res) => {
	try {
		const found = await User.findById(req.params._id);
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
			const exercises = await Exercise.find({}, { user_id: 0, _id: 0, username: 0 }).gt("date", from).lt("date", to).limit(limit);
			const logs = exercises.map(e => ({
				description: e.description,
				duration: e.duration,
				date: e.date.toDateString()
			}));
			res.json({
				username: found["username"],
				count: exercises.length,
				_id: found["_id"],
				log: logs
			})
		}
	} catch (e) {
		console.log("Error: " + e);
		res.send("There was an error getting the logs.");
	}
});

app.post("/api/users", async (req, res) => {
	try {
		const username = req.body["username"];
		const result = await User.findOne({ username: username }, { __v: 0 });
		if (!result) {
			const user = new User({ username: username });
			const inserted = await user.save();
			res.json(inserted);
		} else {
			res.json(result);
		};
	} catch (e) {
		console.log("Error: " + e);
		res.send("There was an error procesing /api/users");
	}
});

app.post("/api/users/:_id/exercises", async (req, res) => {
	try {
		const result = await User.findById(req.params._id);
		if (result) {
			let { description, duration, date } = req.body;
			const exercise = new Exercise({
				user_id: result["_id"],
				description: description,
				duration: duration,
				date: date ? new Date(date) : new Date()
			});
			const saved = await exercise.save();
			res.json({
				_id: saved["user_id"],
				username: result["username"],
				description: saved["description"],
				duration: saved["duration"],
				date: saved["date"].toDateString()
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
		res.json("There was an error procesing /api/users/:_id/exercises");
	}
});

app.listen(port, () => {
	console.log(`Listening on port ${port}.`);
});

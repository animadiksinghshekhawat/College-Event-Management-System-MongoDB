const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect("mongodb://127.0.0.1:27017/college_events")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err.message));

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  venue: { type: String, required: true, trim: true },
  description: { type: String, trim: true }
}, { timestamps: true });

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  course: { type: String, trim: true }
}, { timestamps: true });

const registrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Participant", required: true }
}, { timestamps: true });
registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

const feedbackSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: "Participant", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true }
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);
const Participant = mongoose.model("Participant", participantSchema);
const Registration = mongoose.model("Registration", registrationSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);

function handleError(res, err) {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: "This participant is already registered for this event." });
  res.status(400).json({ message: err.message || "Request failed" });
}

// EVENTS - Create, Read, Update, Delete
app.get("/api/events", async (req,res) => {
  try { res.json(await Event.find().sort({ date: 1, createdAt: -1 })); }
  catch (err) { handleError(res, err); }
});
app.post("/api/events", async (req,res) => {
  try { res.status(201).json(await Event.create(req.body)); }
  catch (err) { handleError(res, err); }
});
app.put("/api/events/:id", async (req,res) => {
  try {
    const item = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Event not found" });
    res.json(item);
  } catch (err) { handleError(res, err); }
});
app.delete("/api/events/:id", async (req,res) => {
  try {
    await Registration.deleteMany({ eventId: req.params.id });
    await Feedback.deleteMany({ eventId: req.params.id });
    const item = await Event.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Event not found" });
    res.json({message:"Event deleted"});
  } catch (err) { handleError(res, err); }
});

// PARTICIPANTS - Create, Read, Update, Delete
app.get("/api/participants", async (req,res) => {
  try { res.json(await Participant.find().sort({ name: 1 })); }
  catch (err) { handleError(res, err); }
});
app.post("/api/participants", async (req,res) => {
  try { res.status(201).json(await Participant.create(req.body)); }
  catch (err) { handleError(res, err); }
});
app.put("/api/participants/:id", async (req,res) => {
  try {
    const item = await Participant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Participant not found" });
    res.json(item);
  } catch (err) { handleError(res, err); }
});
app.delete("/api/participants/:id", async (req,res) => {
  try {
    await Registration.deleteMany({ participantId: req.params.id });
    await Feedback.deleteMany({ participantId: req.params.id });
    const item = await Participant.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Participant not found" });
    res.json({message:"Participant deleted"});
  } catch (err) { handleError(res, err); }
});

// REGISTRATIONS
app.get("/api/registrations", async (req,res) => {
  try { res.json(await Registration.find().populate("eventId").populate("participantId").sort({ createdAt: -1 })); }
  catch (err) { handleError(res, err); }
});
app.post("/api/registrations", async (req,res) => {
  try { res.status(201).json(await Registration.create(req.body)); }
  catch (err) { handleError(res, err); }
});
app.delete("/api/registrations/:id", async (req,res) => {
  try { await Registration.findByIdAndDelete(req.params.id); res.json({message:"Registration removed"}); }
  catch (err) { handleError(res, err); }
});

// FEEDBACK
app.get("/api/feedback", async (req,res) => {
  try { res.json(await Feedback.find().populate("eventId").populate("participantId").sort({ createdAt: -1 })); }
  catch (err) { handleError(res, err); }
});
app.post("/api/feedback", async (req,res) => {
  try { res.status(201).json(await Feedback.create(req.body)); }
  catch (err) { handleError(res, err); }
});
app.delete("/api/feedback/:id", async (req,res) => {
  try { await Feedback.findByIdAndDelete(req.params.id); res.json({message:"Feedback deleted"}); }
  catch (err) { handleError(res, err); }
});

// MONGODB AGGREGATION PIPELINES
// 1. Registration count per event using $lookup + $group + $sort
app.get("/api/analytics/event-registrations", async (req,res) => {
  try {
    const data = await Event.aggregate([
      { $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "eventId",
          as: "registrations"
      }},
      { $project: {
          name: 1,
          date: 1,
          venue: 1,
          registrationCount: { $size: "$registrations" }
      }},
      { $sort: { registrationCount: -1, name: 1 } }
    ]);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

// 2. Average rating per event using $lookup + $unwind + $group
app.get("/api/analytics/event-ratings", async (req,res) => {
  try {
    const data = await Event.aggregate([
      { $lookup: {
          from: "feedbacks",
          localField: "_id",
          foreignField: "eventId",
          as: "feedback"
      }},
      { $project: {
          name: 1,
          averageRating: { $cond: [
            { $gt: [{ $size: "$feedback" }, 0] },
            { $round: [{ $avg: "$feedback.rating" }, 2] },
            0
          ]},
          feedbackCount: { $size: "$feedback" }
      }},
      { $sort: { averageRating: -1, name: 1 } }
    ]);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

// 3. Participant registration count using $lookup + $project + $sort
app.get("/api/analytics/participant-registrations", async (req,res) => {
  try {
    const data = await Participant.aggregate([
      { $lookup: {
          from: "registrations",
          localField: "_id",
          foreignField: "participantId",
          as: "registrations"
      }},
      { $project: {
          name: 1,
          email: 1,
          course: 1,
          registrationCount: { $size: "$registrations" }
      }},
      { $sort: { registrationCount: -1, name: 1 } }
    ]);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

// 4. Overall event analytics using $group
app.get("/api/analytics/summary", async (req,res) => {
  try {
    const [registrationStats, ratingStats] = await Promise.all([
      Registration.aggregate([
        { $group: {
            _id: "$eventId",
            totalRegistrations: { $sum: 1 }
        }},
        { $group: {
            _id: null,
            totalRegistrations: { $sum: "$totalRegistrations" },
            eventsWithRegistrations: { $sum: 1 },
            averageRegistrationsPerEvent: { $avg: "$totalRegistrations" }
        }}
      ]),
      Feedback.aggregate([
        { $group: {
            _id: null,
            totalFeedback: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            highestRating: { $max: "$rating" }
        }}
      ])
    ]);
    res.json({
      registrations: registrationStats[0] || {
        totalRegistrations: 0, eventsWithRegistrations: 0, averageRegistrationsPerEvent: 0
      },
      feedback: ratingStats[0] || {
        totalFeedback: 0, averageRating: 0, highestRating: 0
      }
    });
  } catch (err) { handleError(res, err); }
});

// DASHBOARD
app.get("/api/stats", async (req,res) => {
  try {
    const [events, participants, registrations, feedback] = await Promise.all([
      Event.countDocuments(), Participant.countDocuments(),
      Registration.countDocuments(), Feedback.countDocuments()
    ]);
    const rating = await Feedback.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]);
    res.json({ events, participants, registrations, feedback, averageRating: rating[0]?.avg || 0 });
  } catch (err) { handleError(res, err); }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));

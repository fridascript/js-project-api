import mongoose from "mongoose"
import thoughtsData from "./data.json" with { type: "json" }

const mongoUrl = "mongodb://localhost/happythoughts"
mongoose.connect(mongoUrl)

const ThoughtSchema = new mongoose.Schema({
  message: String,
  hearts: Number,
  createdAt: Date
})

const Thought = mongoose.model("Thought", ThoughtSchema)

const seedDatabase = async () => {
  try {
    await Thought.deleteMany()
    await Thought.insertMany(thoughtsData)
    consoloe.log("Database seeded successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {
    mongoose.connection.close()
  }
}

seedDatabase()
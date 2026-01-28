import dotenv from "dotenv"
dotenv.config()
import mongoose from "mongoose"
import thoughtsData from "./data.json" with { type: "json" }

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happythoughts"
mongoose.connect(mongoUrl)



// defining 'though schema' simple for seeding 
const ThoughtSchema = new mongoose.Schema({
  message: String,
  hearts: Number,
  createdAt: Date
})

const Thought = mongoose.model("Thought", ThoughtSchema)

// function to populate the database 
const seedDatabase = async () => {
  try {
    // delete all existing thoughts
    await Thought.deleteMany()
    // insert all thoughts from data.json
    await Thought.insertMany(thoughtsData)
    console.log("Database seeded successfully!")
  } catch (error) {
    console.error("Error seeding database:", error)
  } finally {

    // closes the database connection when done
    mongoose.connection.close()
  }
}

seedDatabase()
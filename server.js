import dotenv from "dotenv"
dotenv.config()
import cors from "cors";
import express from "express";
import thoughtsData from "./data.json" with { type: "json" };
import mongoose from "mongoose";


//connect to MongoDB
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happythoughts"
mongoose.connect(mongoUrl)
mongoose.Promise = Promise

// define the thought model

const ThoughtSchema = new mongoose.Schema ({
  message: {
    type: String,
    required: true,
    minglength: 5,
    maxlength: 140
  },
  hearts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})
const Thought = mongoose.model("Thought", ThoughtSchema)


// Defines the port the app will run on. 
const port = process.env.PORT || 8080
const app = express()

// Middlewares to enable cors and json body parsing
app.use(cors())
app.use(express.json())

//routes

// documentation endpoints 
app.get("/", (req, res) => {
  
  res.json ({
    message: "Happy Thoughts API!",
    endpoints: [ 
      {
       path: "/thoughts",
       method: "GET",
       description: "Returns all thoughts",
       queryParams: "?sort=hearts or ?sort=date"
    },
    {
      path: "/thoughts/:id",
      method: "GET",
      description: "Returns a single thought by ID"
    },
    {
      path: "/thoughts",
      method: "POST",
      description: "Creates a new thought",
      body: { message: "Your happy thought (5-140 characters)" }
    },
    {
      path: "/thoughts/:id/like",
      method: "PATCH",
      description: "Likes a thought message" 
    },
    {
      path: "/thoughts/:id",
      method: "DELETE",
      description: "Deletes a thought by ID"
    }
    ]
  })
}); 

// route get all thoughts (with sorting option)
app.get("/thoughts", async (req, res) => {
  try{
  const { sort } = req.query
  let query = Thought.find()

  if (sort === "hearts") {
    query = query.sort({ hearts: -1 })
  } else if (sort === "date") {
    query.sort = query.sort ({ createdAt: -1})
  }

  const thoughts = await query.limit (25)
  res.json(thoughts)
} catch (error) {
  res.status(400).json({ error: "Sorry! Couldn't fetch any thoughts"})
}
});

// route to get a thought by ID
app.get("/thoughts/:id", async (req,res) => {
  try {
  const { id } = req.params
  const thought = await Thought.findById(id)

  if (thought) {
    res.json(thought)
  }else {
    res.status(404).json({error: "Sorry, no thought found"})
  }
} catch (error ) {
  res.status(400).json({ error: "Invalid thought ID"})
}
});

// route to create a new thought 
app.post("/thoughts", async (req, res) => {
  try{
    const { message } = req.body 

    const newThought = await Thought.create ({ message })
    res.status(201).json(newThought)


  } catch (error) {
    if (error.name === "ValidationError"){
      res.status(400).json({
        error: "Validation failed",
        details: error.message
      })
    } else {
      res.status(500).json({ error: "Could not create thought"})
    }
  }
});

// route to delete thoughts by ID
app.delete("/thoughts/:id", async (req, res) =>{ 
  try {
    const { id } = req.params
    const deletedThought = await Thought.findByIdAndDelete(id)

    if (deletedThought) {
      res.json ({ message: "Thought deleted", deletedThought })
    } else {
      res.status(404).json({ error: "Thought not found"})
    }
  } catch (error) {
    res.status(400).json({ error: "Could not delete thought" })
  }
});

// route to like a thought
app.patch("/thoughts/:id/like", async (req,res) => {
  try {
    const { id } = req.params
    const thought = await Thought.findByIdAndUpdate (
      id,
      {$inc: {hearts: 1 }},
      { new: true }
    )

    if (thought) {
      res.json(thought)
    } else {
      res.status(404).json({ error: "Thought not found"})
    }
  } catch (error) {
    res.status(400).json({ error: "Could not update thought" })
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
});

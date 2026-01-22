import cors from "cors"
import express from "express"
import thoughtsData from "./data.json" with { type: "json" }

let thoughts = thoughtsData

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(express.json())

// Start defining your routes here
// app.get("/", (req, res) => {
//   res.send("Hello Technigo!")
// })

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
    }
    ]
  });
}); 

app.get("/thoughts", (req, res) => {
  const { sort } = req.query

  let result = [...thoughts]

  if (sort === "hearts") {
    result.sort((a, b) => b.hearts - a.hearts)
  } else if (sort === "date") {
    result.sort ((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  res.json(result)
});

app.get("/thoughts/:id", (req,res) => {
  const { id } = req.params
  const thought = thoughts.find((t) => t._id === id)

  if (thought) {
    res.json(thought)
  }else {
    res.status(404).json({error: "Thought not found"})
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
});

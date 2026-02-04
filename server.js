import "dotenv/config";
import cors from "cors";
import express from "express";
import thoughtsData from "./data.json" with { type: "json" };
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

// connect to MongoDB
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/happythoughts";
mongoose.connect(mongoUrl);
mongoose.Promise = Promise;

const UserSchema = new mongoose.Schema({
  name:{
    type: String, 
    unique: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
}); 

const User = mongoose.model("User", UserSchema);

//authentication middleware (checks if user has valid token)
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({ accessToken });
    if (user) {
      req.user = user;
      next();
    } else {
      return res.status(401).json({
        success: false,
        response: null,
        message: "please log in"
      });
    }
  } catch (error) {
    return res.status(500).json({
        success: false,
        response: null,
        message: "Authentication failed"
    });
  }
};

// defines the port the app will run on
const port = process.env.PORT || 8080;
const app = express();

// middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// define the thought model
const ThoughtSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    minLength: 5,
    maxLength: 140
  },
  hearts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Thought = mongoose.model("Thought", ThoughtSchema);

// seed example from class (use RESET_DB=true npm run dev)
if (process.env.RESET_DB) {
  const seedDatabase = async () => {
    await Thought.deleteMany();
    
    thoughtsData.forEach((thought) => {
      new Thought(thought).save();
    });
  };
  seedDatabase();
}

// routes

// documentation endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Happy Thoughts API!",
    endpoints: [
  { 
        path: "/users",
        method: "POST",
        description: "Register a new user",
        body: { name: "string", email:"string", password:"string"}
      },
       { 
        path: "/sessions",
        method: "POST",
        description: "Log in (returns accessToken)",
        body: { email: "string", password:"string"}
      },
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
        description: "Creates a new thought (req authentication)",
        headers: { Authorization: "accessToken"},
        body: { message: "Your happy thought (5-140 characters)" }
      },
      {
        path: "/thoughts/:id",
        method: "PATCH",
        description: "Updates a thought message (req authentication)",
        headers: { Authorization: "accessToken" },
        body: { message: "Updated thought (5-140 characters)" }
      },
      {
        path: "/thoughts/:id/like",
        method: "PATCH",
        description: "Likes a thought (increments hearts by 1)"
      },
      {
        path: "/thoughts/:id",
        method: "DELETE",
        description: "Deletes a thought by ID (req authentication)",
        headers: { Authorization: "accessToken" }
      }
    ]
  });
});

// route to get all thoughts (with optional sorting)
app.get("/thoughts", async (req, res) => {
  try {
    const { sort } = req.query;
    let query = Thought.find();

    if (sort === "hearts") {
      query = query.sort({ hearts: -1 });
    } else if (sort === "date") {
      query = query.sort({ createdAt: -1 });
    }

    const thoughts = await query.limit(20);
    
    return res.status(200).json({
      success: true,
      response: thoughts,
      message: "Success"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: [],
      message: "Could not fetch thoughts"
    });
  }
});

// route to register a new user

app.post("/users", async (req, res) => {
  try {
    const {name, email, password } = req.body;

    const salt = bcrypt.genSaltSync();

    const user = new User({
      name,
      email,
      password: bcrypt.hashSync(password, salt)
    });

    await user.save();

    res.status(201).json({
      id: user._id,
      accessToken: user.accessToken
    });
  } catch (err) {
    res.status(400).json({
      message: "could not create user",
      errors: err.errors
    });
  }
});

// route to log in (sessions)

app.post("/sessions", async (req,res) => {
  try {
    const { email, password } = req.body;

    //find user by email
    const user = await User.findOne ({ email });

    // check if user exists and password is correct 
    if (user && bcrypt.compareSync(password, user.password)) {
      return res.status(200).json({
        success: true,
        response: {
          userId: user._id,
          name: user.name,
          email: user.email,
          accessToken: user.accessToken
        },
        message: "Login successful"
      });
    } else {
      return res.status(401).json({
        success: false,
        response: null,
        message: "Invalid email or password"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not log in"
    });
  }
});

// route to get a single thought by ID
app.get("/thoughts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // validate ID format before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format"
      });
    }
    
    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found"
      });
    }

    return res.status(200).json({
      success: true,
      response: thought,
      message: "Success"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not fetch thought"
    });
  }
});

// route to create a new thought
app.post("/thoughts", authenticateUser, async (req, res) => {
  try {
    const { message } = req.body;

    const newThought = await Thought.create({ message });
    
    return res.status(201).json({
      success: true,
      response: newThought,
      message: "Thought created successfully"
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Validation failed",
        details: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not create thought"
    });
  }
});

// route to delete a thought by ID
app.delete("/thoughts/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // validate ID format before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format"
      });
    }
    
    const deletedThought = await Thought.findByIdAndDelete(id);

    if (!deletedThought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found"
      });
    }

    return res.status(200).json({
      success: true,
      response: deletedThought,
      message: "Thought deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not delete thought"
    });
  }
});

// route to update a thought message (authenticated)
app.patch("/thoughts/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    // validate ID format before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format"
      });
    }
    
    // validate message length
    if (!message || message.length < 5 || message.length > 140) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Message must be between 5 and 140 characters"
      });
    }
    
    const updatedThought = await Thought.findByIdAndUpdate(
      id,
      { message },
      { new: true, runValidators: true }
    );

    if (!updatedThought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found"
      });
    }

    return res.status(200).json({
      success: true,
      response: updatedThought,
      message: "Thought updated successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not update thought"
    });
  }
});

// route to like a thought (increment hearts by 1)
app.patch("/thoughts/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    
    // validate ID format before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        response: null,
        message: "Invalid ID format"
      });
    }
    
    const thought = await Thought.findByIdAndUpdate(
      id,
      { $inc: { hearts: 1 } },
      { new: true }
    );

    if (!thought) {
      return res.status(404).json({
        success: false,
        response: null,
        message: "Thought not found"
      });
    }

    return res.status(200).json({
      success: true,
      response: thought,
      message: "Thought liked successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      response: null,
      message: "Could not like thought"
    });
  }
});

// start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
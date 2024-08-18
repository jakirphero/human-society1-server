const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware
app.use(cors());
app.use(express.json());

//human-society
//GNR2bevaKRMUVkci

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t1ods8h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const postCollection = client.db("humanSociety").collection("post");
        const userCollection = client.db("humanSociety").collection("users");

        //jwt token
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        //middleware
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorize access' })
            };
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorize access' });
                }
                req.decoded = decoded;
                next();
            })
        }

        //user api
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const exitingUser = await userCollection.findOne(query);
            if (exitingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        //post api
        app.post("/post", async (req, res) => {
            const post = req.body;
            const result = await postCollection.insertOne(post);
            res.send(result);
        });
        app.post("/post/:id/comment", async (req, res) => {
            const postId = req.params.id;
            const comment = req.body;
            const filter = { _id: new ObjectId(postId) };
            const updateDoc = {
                $push: {
                    comments: comment
                }
            };
            try {
                const result = await postCollection.updateOne(filter, updateDoc);
                if (result.modifiedCount > 0) {
                    res.send({ message: 'Comment added successfully' });
                } else {
                    res.send({ message: 'Failed to add comment' });
                }
            } catch (error) {
                res.status(500).send({ message: 'Error adding comment', error });
            }
        });
        app.put("/post/:id/like", async (req, res) => {
            try {
                const postId = req.params.id;
                const filter = { _id: new ObjectId(postId) };
                const updateDoc = {
                    $inc: {
                        likes: 1
                    }
                };
                const result = await postCollection.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: 'Post not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal server error', error });
            }
        });
        app.get("/post", async (req, res) => {
            const result = await postCollection.find().toArray();
            res.send(result)
        });
        app.get("/post/:email", async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const result = await postCollection.find(query).toArray();
            res.send(result);
        })
        app.get("/post/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                return res.status(403).send({ message: 'Forbidden access' });
            };
            const query = { userEmail: email };
            const result = await postCollection.find(query).toArray();
            res.send(result);
        })
        app.delete("/post/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await postCollection.deleteOne(query);
            res.send(result);
        });
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Human society is running')
})

app.listen(port, () => {
    console.log(`Human society server is running on port ${port}`)
})
const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const stripe = require("stripe")(process.env.STRIPE_SECREST_KEY)
const port = process.env.PORT || 5000;

// middleWares
app.use(cors())
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
app.use(cors(corsConfig))
app.options("*", cors(corsConfig))
app.use(express.json())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,authorization")
    next()
})
app.use(express.json())

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_APSS}@cluster0.cremm.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('nutsManufacture').collection('products')
        const bookingCollection = client.db('nutsManufacture').collection('booking')
        const userCollection = client.db('nutsManufacture').collection('users')
        const reviewsCollection = client.db('nutsManufacture').collection('reviews')
        const addProductCollection = client.db('nutsManufacture').collection('addProduct')

        // all product get and show home page
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        //
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product)
        })

        // products booking api
        app.post('/booking', async (req, res) => {
            const booking = req.body
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })

        // booking data get for show my orders in dashboard
        app.get('/booking', async (req, res) => {
            const email = req.query.email
            const query = { email: email };
            const booking = await bookingCollection.find(query).toArray()
            res.send(booking)
        })

        // get for payment
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const payment = await bookingCollection.findOne(query)
            res.send(payment)
        })

        // admin api
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }

        });

        // update login api
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN, { expiresIn: '1h' })
            res.send({ result, token })
        })



        // user reviews post api
        app.post('/reviews', async (req, res) => {
            const reviews = req.body
            const result = await reviewsCollection.insertOne(reviews);
            res.send(result)
        })

        // my reviews get api
        app.get('/reviews', async (req, res) => {
            const email = req.query.email
            const query = { email: email };
            const reviews = await reviewsCollection.find(query).toArray()
            res.send(reviews)
        })

        // all user reviews get api
        app.get('/allReviews', async (req, res) => {
            const query = {};
            const allReviews = await reviewsCollection.find(query).toArray()
            res.send(allReviews)
        })

        // all user get 
        app.get('/allUsers', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })

        // admin add products api
        app.post('/addProduct', async (req, res) => {
            const addProcuct = req.body
            const result = await addProductCollection.insertOne(addProcuct);
            res.send(result)
        })

        // admin add products get api
        app.get('/addProducts', async (req, res) => {
            const query = {};
            const addProducts = await addProductCollection.find(query).toArray()
            res.send(addProducts)
        })

        // admin product delete api
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const result = await addProductCollection.deleteOne(query);
            res.send(result)
        })

        // payment system
        app.post("/create-payment-intent", async (req, res) => {
            const product = req.body
            const us = product.us
            const amount = us * 100
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                automatic_payment_methods: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });

        })


    }
    finally {

    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log('success', port)
})
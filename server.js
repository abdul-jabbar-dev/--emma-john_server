const express = require('express')
const { MongoClient } = require('mongodb');
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
var admin = require("firebase-admin");
var serviceAccount = require("./emma-jonh-simple-firebase-adminsdk-rjk69-315eb560fa.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
require('dotenv').config()
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER_USERNAME}:${process.env.DB_USER_PASS}@cluster0.wieyd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const database = client.db('ema_john')
const allProducts = database.collection('products')
const allOrders = database.collection('orders')

async function varify(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers?.authorization.split(' ')[1]
        try {
            const valid = await admin.auth().verifyIdToken(idToken)
            req.decodedUserEmail = valid.email
        }
        catch {
            console.dir(Error)
        }
    } next()
}
async function run() {
    try {
        await client.connect();
        // products collections 
        app.get('/products', async (req, res) => {
            const cursor = allProducts.find({})
            const page = req.query.page
            const size = parseInt(req.query.size)
            const count = await cursor.count()
            let data;
            if (page) {
                data = await cursor.skip(page * size).limit(size).toArray()

            } else {
                data = await cursor.toArray()
            }
            res.send({ count, data })
        })
        app.post('/products/cartkeys', async (req, res) => {
            const keys = req.body
            const query = { key: { $in: keys } }
            const product = await allProducts.find(query).toArray()

            res.json(product)
        }
        )
        app.get('/orders', varify, async (req, res) => {
            console.log(req)
            const email = req.query.email
            if (req.decodedUserEmail === email) {
                const find = { email: email }
                const query = allOrders.find(find)
                const cursor = await query.toArray()
                res.json(cursor)
            } else {
                res.status(401).json({ message: 'user not authorize' })
            }

            // res.json(result)
        })
        app.post('/orders', async (req, res) => {
            const order = req.body
            const result = await allOrders.insertOne(order)
            res.json(result)
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (rq, res) => {
    res.send('server ok')
})



app.listen(port, () => console.log(`Example app listening on port ${port}!`))
/*
DB_USER=travelDBUser
DB_PASSWORD=yqR9aa7FQOePfqv2
ACCESS_TOKEN_SECRET=a82c01f3e49e7c5e77a1ddcab9dbd4e2e64f23401dcea07a5402a9b083e6d418aa71a65e6fcd496ee35f51042d1dcd0914246f3c122c30f255e25e3ffa7e8ef0
STRIPE_SECRET=sk_test_51N3foiGn4oE3WVXCgQSXeJzqwLQa97LhGyJxN3d3I6kJ0V6PAFOMCU0kSNsBb22SidKzZ4XgFNlZjzMlgqrWjNPQ000j0lYAAt
*/ 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors')
require('dotenv').config();
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET)
const app = express();
const port =process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

const hotels = require('./Data/hotels.json')



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.uidhp96.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// token verify



function VerifyJwt(req,res,next){
const authHeader = req.headers.authorization;
if(!authHeader){
    res.status(401).send({
        message:'unauthorized access'
    })
}
const token = authHeader.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,function(err,decoded){
      if (err) {
        return res.status(403).send({message: 'unauthorized access'});
        
      }
      req.decoded = decoded;
      next();
    })
}



async function run (){
    try{
        const placesCollection = client.db('travelAgency').collection('places')
        const orderCollection = client.db('travelAgency').collection('orders')
        const paymentsCollection = client.db('travelAgency').collection('payments')
        const usersCollections = client.db('travelAgency').collection('users')
    
        const verifyAdmin = async(req,res,next) =>{
          // console.log('inside verifyAdmin', req.decoded.email);
          
          next();
         }
        app.post('/jwt',(req,res)=>{
            const user = req.body;
            const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET)
            res.send({token})
            
        })
         app.get('/jwt', async(req,res)=>{
          const email =req.query.email;
          const query = {email:email}
          const user = await usersCollections.findOne(query)
         if (user) {
          const token = jwt.sign({email},process.env.ACCESS_TOKEN_SECRET)
       return res.send({accessToken:token});
        }
          res.status(403).send({accessToken: ''})
         })

         //user 
        app.get('/users', async (req, res) => {
          const query = {};
          const users = await usersCollections.find(query).toArray();
          res.send(users)
    
    
        })
    
        // save user data
        app.post('/users', async (req, res) => {
          const user = req.body;
          const result = await usersCollections.insertOne(user);
          res.send(result)
        })

        app.delete('/users/:id', async(req,res)=>{
          const id = req.params.id;
          const query = {_id: new ObjectId(id)}
          const result = await usersCollections.deleteOne(query);
          res.send(result)

        })


        app.get('/places', async(req,res)=>{
            const page =parseInt( req.query.page);
            const size = parseInt(req.query.size);
            console.log(page,size)
     const query = {};

     const cursor = placesCollection.find(query)
     const places = await cursor.skip(page*size).limit(size).toArray();
     const count = await placesCollection.estimatedDocumentCount()
 res.send({count,places})
        })

            // check admin
    app.get('/users/admin/:email',async(req,res)=>{
      
      const email= req.params.email;
      const query = {email}
      const user = await usersCollections.findOne(query);
      res.send({isAdmin: user?.role ==='admin'})
    })


    // make admin
    app.put('/users/admin/:id', async (req, res) => {
     
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollections.updateOne(filter, updatedDoc, options);
      res.send(result)
    })


        app.get('/place/:id',async(req,res)=>{

            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            // console.log(id)
            const place = await placesCollection.findOne(query)
            res.send(place)

        })

        app.get('/places/limit', async(req,res)=>{
     const query = {};

     const cursor = placesCollection.find(query)
     const place = await cursor.limit(3).toArray();
 res.send(place)
        })

          //orders Api 
        // post Kora hosse data create korar jonno

           app.post('/orders', async(req,res)=>{
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
           })

           app.get('/orders', async(req,res)=>{
            // const page =parseInt( req.query.page);
            // const size = parseInt(req.query.size);
          
     const query = {};

     const cursor = orderCollection.find(query)
     const orders =await cursor.toArray();
    //  const count = await orderCollection.estimatedDocumentCount()
  res.send(orders)

        })
           app.get('/order',VerifyJwt, async(req,res)=>{
         //   const page =parseInt( req.query.page);
        //    const size = parseInt(req.query.size);
           // console.log(page,size)
          
           const decoded = req.decoded;
           console.log("inside orders api", decoded);

           if (decoded.email !==req.query.email) {

            res.status(403).send({
                message:"Unauthorized access"
            })
           }

     let query = {};

     if (req.query.email) {
        query={
            email:req.query.email
        }
        
     }


     const cursor = orderCollection.find(query)
     const orders = await cursor.toArray();
   //  const count = await orderCollection.estimatedDocumentCount()
 res.send(orders)
        })

        app.get('/orders/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const order = await orderCollection.findOne(query);
            res.send(order)
          })

        app.patch('/orders/:id',async (req,res)=>{
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: new ObjectId(id) }
            const updatedDoc = {
                $set:{
                    status:status
                }
            }
            const result = await orderCollection.updateOne(query,updatedDoc);
            res.send(result)
        })

        app.delete('/orders/:id', async(req,res)=>{
 const id = req.params.id;
 const query = {_id: new ObjectId(id)}
 const result = await orderCollection.deleteOne(query);
 res.send(result)

        })
        // make admin to any user
        app.patch('/orders/admin/:id',async(req,res)=>{
          const id = req.params.id;
          const filter = {_id: ObjectId(id)}
          const updatedDoc = {
            $set:{

            }
          }
        })



        




         // Payment Gateway
    app.post('/create-payment-intent',async(req,res)=>{
        const booking = req.body;
        const price = booking.price;
        const amount = price* 100;
  
        const paymentIntent = await stripe.paymentIntents.create({
          currency : 'usd',
          amount : amount,
          "payment_method_types":[
            "card"
          ]
        })
        res.send({
          clientSecret: paymentIntent.client_secret,
        })
  
      })

      // save payment data
 app.post('/payments',async(req,res)=>{
  const payment = req.body;
  const result = await paymentsCollection.insertOne(payment);
  const id = payment.bookingId
const filter = {_id: new ObjectId(id)}
const updatedDoc = {
  $set:{
    paid: true,
    transactionId:payment.transactionId
  }
}

const updatedResult = await orderCollection.updateOne(filter,updatedDoc)
  res.send(result)
 })



    }
    finally{

    }
}

run().catch(err => console.log(err.message))

app.get('/',(req,res)=>{
    res.send('travel guru server is running')
});

app.get('/hotels',(req,res)=>{
 res.send(hotels)
})

// const place = require('./Data/place.json')

// app.get('/place',(req,res)=>{
//     res.send(place)
// })

app.listen(port, ()=>{
    console.log(`Travel is running on port,${port}`)
})
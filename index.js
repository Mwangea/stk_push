const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const port = process.env.PORT;
const mongoose = require("mongoose");
const Payment = require("./models/PaymentModel");

app.listen(port, () => {
    console.log(`app is running at port: ${port}`);
});

mongoose.connect(process.env.DB).then(() =>{
    console.log("database connected successfully");
}).catch((err) =>{
    console.log(err.message);
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
    res.send("<h1>Hello World</h1>");
});

// Middleware function to generate token
const generateToken = async (req, res, next) => {
    try {
        const secret = process.env.SECRET_KEY;
        const consumer = process.env.CONSUMER_KEY;

        const auth = Buffer.from(`${consumer}:${secret}`).toString("base64");
        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: {
                    authorization: `Basic ${auth}`,
                },
            }
        );

        // Set the token in the request object
        req.token = response.data.access_token;
        next();
    } catch (err) {
        console.log(err);
        res.status(400).json(err.message);
    }
};

app.get("/token", generateToken, (req, res) => {
    res.sendStatus(200);
});

app.post("/stk", generateToken, async (req, res) => {
    const phone = req.body.phone.substring(1);
    const amount = req.body.amount;

    const date = new Date();
    const timestamp =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const short_code = process.env.PAY_BILL;
    const passkey = process.env.MPESA_PASSKEY;

    const password = Buffer.from(short_code + passkey + timestamp).toString("base64");

    try {
        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: short_code,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: `254${phone}`,
                PartyB: short_code,
                PhoneNumber: `254${phone}`,
                CallBackURL: "https://5279-102-219-210-66.ngrok-free.app/callback",
                AccountReference: "Mwangea Online Business",
                TransactionDesc: "Test",
            },
            {
                headers: {
                    Authorization: `Bearer ${req.token}`, // Access the token from the request object
                },
            }
        );
        console.log(response.data);
        res.status(200).json(response.data);
    } catch (err) {
        console.log(err.message);
        res.status(400).json(err.message);
    }
});

app.post("/callback", (req, res) =>{
    const callbackData = req.body;
    console.log(callbackData.Body);
    if (!callbackData.Body.stkCallback.CallbackMetadata){
        console.log(callbackData.Body);
        return res.json("ok");
    }

    //console.log(callbackData.Body.stkCallback.CallbackMetadata);

    const phone = callbackData.Body.stkCallback.CallbackMetadata.Item[4].Value;
    const amount = callbackData.Body.stkCallback.CallbackMetadata.Item[0].Value;
    const trans_id = callbackData.Body.stkCallback.CallbackMetadata.Item[1].Value;

    console.log({ phone, amount, trans_id});

    const payment = new Payment();

    payment.number = phone;
    payment.amount = amount;
    payment.trans_id = trans_id;

    payment.save().then((data) =>{
        console.log({message: "saved succefully", data});
    }).catch((err) =>{
        console.log(err.message);
    });
});
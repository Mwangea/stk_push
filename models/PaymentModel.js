const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema(
    {
        number: { type: String, required: true},
        trans_id: { type: String, required: true},
        amount: { type: String, required: true},
    },
    { timestamp: true}
);

const Payment = mongoose.model("payment", paymentSchema);

module.exports = Payment;
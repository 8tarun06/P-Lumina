const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Razorpay configuration - hardcoded
const razorpayConfig = {
  key_id: "rzp_test_RY6orIi5COd68k",
  key_secret: "VQt6VG48g0YIUEALYSQq6C3n"
};

// Simple CORS handler
const corsHandler = (req, res, callback) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  callback(req, res);
};

// Create order function
// In createOrder function
exports.createOrder = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      console.log("📦 Create order request received");
      console.log("📨 Request body:", req.body);
      console.log("🔢 Amount received:", req.body.amount);

      const { amount } = req.body;

      // Better validation
      if (!amount || isNaN(amount) || amount <= 0) {
        console.error("❌ Invalid amount:", amount);
        return res.status(400).json({
          success: false,
          error: "Valid amount is required"
        });
      }

      const razorpay = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
      });

      const order = await razorpay.orders.create({
        amount: Math.round(amount),
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: 1
      });

      console.log("✅ Order created:", order.id);

      res.json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency
        }
      });

    } catch (error) {
      console.error("❌ Order creation error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});

// In verifyPayment function
// In verifyPayment function - ADD THE MISSING VERIFICATION CODE
exports.verifyPayment = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      console.log("🔍 Verify payment request received");
      console.log("📨 Request body:", req.body);

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error("❌ Missing payment details:", {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          signature: razorpay_signature
        });
        return res.status(400).json({
          success: false,
          error: "Missing payment details"
        });
      }

      // ✅ ADD THIS VERIFICATION CODE:
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", razorpayConfig.key_secret)
        .update(body)
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      console.log("🔐 Payment verification:", isAuthentic ? "SUCCESS" : "FAILED");
      console.log("📊 Signature comparison:", {
        expected: expectedSignature,
        received: razorpay_signature,
        match: isAuthentic
      });

      res.json({
        success: isAuthentic,
        message: isAuthentic ? "Payment verified successfully" : "Invalid signature",
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });

    } catch (error) {
      console.error("❌ Payment verification error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});


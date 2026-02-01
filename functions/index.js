const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Set global options
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

// Use environment variables for security
const razorpayConfig = {
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RY6orIi5COd68k",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "VQt6VG48g0YIUEALYSQq6C3n"
};

console.log("🔑 Razorpay Config Loaded:", {
  key_id: razorpayConfig.key_id ? `${razorpayConfig.key_id.substring(0, 8)}...` : "NOT FOUND",
  has_secret: !!razorpayConfig.key_secret
});

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

// Create order function - UPDATED WITH BETTER VALIDATION
exports.createOrder = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      console.log("📦 Create order request received");
      console.log("📨 Request body:", req.body);
      console.log("🔢 Amount received:", req.body.amount);

      const { amount, currency = "INR" } = req.body;

      // Better validation with Razorpay limits
      if (!amount || isNaN(amount) || amount <= 0) {
        console.error("❌ Invalid amount:", amount);
        return res.status(400).json({
          success: false,
          error: "Valid amount is required"
        });
      }

      // Convert to number and validate range
      const amountNum = Number(amount);
      
      // Razorpay limits: min 1 INR (100 paise), max 2000000 INR (200000000 paise)
      if (amountNum < 100) {
        console.error("❌ Amount too small:", amountNum);
        return res.status(400).json({
          success: false,
          error: "Minimum amount is 1 INR (100 paise)"
        });
      }

      if (amountNum > 200000000) {
        console.error("❌ Amount exceeds Razorpay limit:", amountNum);
        return res.status(400).json({
          success: false,
          error: "Amount exceeds maximum limit of 2,00,000 INR"
        });
      }

      // Log the amount in INR for debugging
      console.log("💰 Amount in Paise:", amountNum);
      console.log("💰 Amount in INR:", (amountNum / 100).toFixed(2));

      // Validate Razorpay credentials
      if (!razorpayConfig.key_id || !razorpayConfig.key_secret) {
        console.error("❌ Missing Razorpay credentials");
        return res.status(500).json({
          success: false,
          error: "Payment gateway configuration error"
        });
      }

      const razorpay = new Razorpay({
        key_id: razorpayConfig.key_id,
        key_secret: razorpayConfig.key_secret
      });

      // Test Razorpay connection
      try {
        const testPayment = await razorpay.payments.all({
          count: 1
        });
        console.log("✅ Razorpay connection test successful");
      } catch (testError) {
        console.error("❌ Razorpay connection failed:", testError.message);
        return res.status(500).json({
          success: false,
          error: "Payment gateway authentication failed. Please check API keys."
        });
      }

      const order = await razorpay.orders.create({
        amount: Math.round(amountNum), // Already in paise
        currency: currency.toUpperCase(),
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payment_capture: 1,
        notes: {
          source: "Vyraa Fashions",
          timestamp: new Date().toISOString()
        }
      });

      console.log("✅ Order created successfully:", {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status
      });

      res.json({
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt
        }
      });

    } catch (error) {
      console.error("❌ Order creation error:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error || error
      });
      
      let errorMessage = "Failed to create payment order";
      let statusCode = 500;
      
      if (error.statusCode === 401) {
        errorMessage = "Invalid Razorpay API keys";
        statusCode = 401;
      } else if (error.statusCode === 400) {
        errorMessage = error.error?.description || "Invalid request to payment gateway";
        statusCode = 400;
      } else if (error.message.includes("amount")) {
        errorMessage = "Invalid amount specified";
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  });
});

// Verify payment function - UPDATED WITH BETTER LOGGING
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
        expected: expectedSignature.substring(0, 20) + "...",
        received: razorpay_signature.substring(0, 20) + "...",
        match: isAuthentic
      });

      res.json({
        success: isAuthentic,
        message: isAuthentic ? "Payment verified successfully" : "Invalid signature",
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        verified: isAuthentic
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
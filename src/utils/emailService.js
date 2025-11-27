// src/utils/emailService.js
import { sendEmail } from './emailConfig'; // You'll need to set this up based on your email service

export const sendCancellationEmail = async (userEmail, order, cancellationData) => {
  const subject = `Order Cancellation Confirmation - #${order.id.slice(0, 8)}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Order Cancellation Confirmed</h2>
      <p>Dear ${userEmail},</p>
      
      <p>Your order <strong>#${order.id.slice(0, 8)}</strong> has been successfully cancelled.</p>
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Cancellation Details:</h3>
        <p><strong>Reason:</strong> ${cancellationData.reason}</p>
        <p><strong>Cancelled Items:</strong> ${order.items.length} item(s)</p>
        <p><strong>Refund Amount:</strong> ₹${order.total}</p>
        <p><strong>Refund Method:</strong> ${cancellationData.paymentMethod === 'cash_on_delivery' ? 'Bank Transfer' : 'Original Payment Method'}</p>
      </div>
      
      <p><strong>Refund Timeline:</strong></p>
      <ul>
        <li>UPI/Card Payments: 3-7 business days</li>
        <li>Cash on Delivery: 5-7 business days to your bank account</li>
      </ul>
      
      <p>If you have any questions, please contact our customer support.</p>
      
      <p>Thank you,<br>Your Store Team</p>
    </div>
  `;

  try {
    await sendEmail(userEmail, subject, htmlContent);
    console.log('Cancellation email sent successfully');
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    // Don't throw error - email failure shouldn't block the cancellation process
  }
};

export const sendReturnEmail = async (userEmail, order, returnData) => {
  const subject = `Return Request Submitted - #${order.id.slice(0, 8)}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Return Request Received</h2>
      <p>Dear ${userEmail},</p>
      
      <p>Your return request for order <strong>#${order.id.slice(0, 8)}</strong> has been submitted successfully.</p>
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Return Details:</h3>
        <p><strong>Reason:</strong> ${returnData.reason}</p>
        <p><strong>Resolution:</strong> ${returnData.resolution === 'refund' ? 'Refund' : 'Replacement'}</p>
        <p><strong>Items to Return:</strong> ${returnData.items.length} item(s)</p>
        ${returnData.resolution === 'refund' ? `<p><strong>Refund Amount:</strong> ₹${returnData.returnAmount}</p>` : ''}
        <p><strong>Scheduled Pickup:</strong> ${new Date(returnData.pickupDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h4 style="margin-top: 0; color: #856404;">📦 Pickup Instructions:</h4>
        <ul>
          <li>Keep the product in original condition with all tags</li>
          <li>Include the original packaging and invoice</li>
          <li>Our delivery agent will collect between 9 AM - 7 PM</li>
          <li>Please ensure someone is available at the delivery address</li>
        </ul>
      </div>
      
      ${returnData.resolution === 'refund' ? `
      <p><strong>Refund Timeline:</strong> 3-7 business days after we receive and verify the returned items.</p>
      ` : `
      <p><strong>Replacement Timeline:</strong> Your replacement will be shipped within 24 hours after we receive the returned items.</p>
      `}
      
      <p>Thank you,<br>Your Store Team</p>
    </div>
  `;

  try {
    await sendEmail(userEmail, subject, htmlContent);
    console.log('Return email sent successfully');
  } catch (error) {
    console.error('Failed to send return email:', error);
  }
};

export const sendReplacementEmail = async (userEmail, order, replacementData) => {
  const subject = `Replacement Scheduled - #${order.id.slice(0, 8)}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Replacement Scheduled</h2>
      <p>Dear ${userEmail},</p>
      
      <p>Your replacement for order <strong>#${order.id.slice(0, 8)}</strong> has been scheduled.</p>
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Replacement Details:</h3>
        <p><strong>Reason for Replacement:</strong> ${replacementData.reason}</p>
        <p><strong>Items Being Replaced:</strong> ${replacementData.items.length} item(s)</p>
        <p><strong>Pickup Scheduled:</strong> ${new Date(replacementData.pickupDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h4 style="margin-top: 0; color: #155724;">🔄 Replacement Process:</h4>
        <ol>
          <li>We'll pick up the original item on the scheduled date</li>
          <li>Once received, we'll verify the item</li>
          <li>Your replacement will be shipped within 24 hours</li>
          <li>You'll receive tracking information for the replacement</li>
        </ol>
      </div>
      
      <p><strong>Important Notes:</strong></p>
      <ul>
        <li>Please keep the product in original condition with all tags</li>
        <li>Include all original accessories and packaging</li>
        <li>Our agent will collect between 9 AM - 7 PM</li>
      </ul>
      
      <p>Thank you for choosing us!<br>Your Store Team</p>
    </div>
  `;

  try {
    await sendEmail(userEmail, subject, htmlContent);
    console.log('Replacement email sent successfully');
  } catch (error) {
    console.error('Failed to send replacement email:', error);
  }
};
// src/utils/emailConfig.js
import { functions } from '../firebase-config'; // If using Firebase Cloud Functions
// OR use your preferred email service (SendGrid, AWS SES, etc.)

// Example using fetch to your backend API
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Alternative: If using Firebase Cloud Functions
export const sendEmailViaFunctions = async (to, subject, htmlContent) => {
  const { httpsCallable } = await import('firebase/functions');
  const sendEmailFunction = httpsCallable(functions, 'sendEmail');
  
  return sendEmailFunction({
    to,
    subject,
    html: htmlContent
  });
};
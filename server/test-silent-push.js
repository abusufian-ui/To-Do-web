const { Expo } = require('expo-server-sdk');
let expo = new Expo();

async function sendTestSilentPush(pushToken) {
  let messages = [];
  messages.push({
    to: pushToken,
    // Omit title, body, and sound entirely to make it a silent/data-only push
    data: { 
        action: 'RUN_BACKGROUND_SYNC',
        timestamp: Date.now().toString()
    },
  });

  let chunks = expo.chunkPushNotifications(messages);
  try {
    let ticketChunk = await expo.sendPushNotificationsAsync(chunks[0]);
    console.log("✅ Silent Push Sent Successfully:", ticketChunk);
  } catch (error) {
    console.error("❌ Error sending push:", error);
  }
}

// Ensure you pass the token when running the file via terminal
const token = process.argv[2];
if (token) {
    sendTestSilentPush(token);
} else {
    console.log("Please provide a token: node test-silent-push.js ExponentPushToken[...]");
}

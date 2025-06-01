// Download the helper library from https://www.twilio.com/docs/node/install
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const authToken = '[AuthToken]';
const client = require('twilio')(accountSid, authToken);

client.conversations.v1.conversations('CHXXXXXXXXXXX')
                        .messages
                        .create({author: 'system', body: ''})
                        .then(message => console.log(message.sid));

/*
 parsed_message contains the following elements:
 originalMessage
 prival
 facilityID
 severityID
 facility
 severity
 type
 time
 host
 message
 timestamp
 hostname
 _id
 message_hash
 previous_hash
 hash
 */
function preprocessor(parsedMessage) {
  console.log(parsedMessage['message']);
  return parsedMessage;
}

module.exports = function (moduleHolder) {
  moduleHolder['console_echo'] = preprocessor;
};
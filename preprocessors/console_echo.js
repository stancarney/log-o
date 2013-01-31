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
 keywords
 _id
 message_hash
 previous_hash
 hash
 */
function preprocessor(parsed_message) {
  console.log(parsed_message['message']);
  return parsed_message;
}

module.exports = function (module_holder) {
  module_holder['console_echo'] = preprocessor;
};
require('dotenv').config()
const request = require('request')
const {getMessage, getMessagefromAudio} = require('../../lib/witai')
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const mqtt = require("mqtt");
const listen = mqtt.connect("mqtt://test.mosquitto.org");
const ffmpeg = require ('fluent-ffmpeg')
const fs = require('fs');
const { RSA_NO_PADDING, SSL_OP_NETSCAPE_CA_DN_BUG } = require('constants');


module.exports = {
   
    handleMessage: async function(sender_psid, received_message){

    let response;
    // Checks if the message contains text
    if (received_message.text) {
      // Create the payload for a basic text message, which
      // will be added to the body of our request to the Send API

      var result = await getMessage(received_message.text)
      var caps= `turning ${result[0][0]} the ${result[1][0]}`
      response = {
        "text": caps
      }
      callSendAPI(sender_psid, response);

      var topic = `esp8266/ghiscure/${result[1][0]}` 
      if(result[0][0]=='on'){
      listen.publish(topic, "1");
      console.log(`${result[0][0]}, ${topic}`);
      }else{
      listen.publish(topic, "0");
      console.log(`${result[0][0]}, ${topic}`);
      }
      
    } 
    else if (received_message.attachments[0].type=="audio") {
      console.log('audio')
      
      // Get the URL of the message attachment
      let attachment_url = received_message.attachments[0].payload.url;
      var options = {
        url: attachment_url, //your image
        encoding: null  //returns resp.body as bytes
     }
      request.get(options,async function (error, response, body) {
            if (!error && response.statusCode == 200) {
              fs.writeFile('audio.mp4', body, async function (err) {
                if (err) console.log(err);
                console.log('save voice notes success');

                
                mp4 = './audio.mp4'
                mp3 = './audio.mp3'

                proc = new ffmpeg({source:mp4})
                proc.setFfmpegPath('ffmpeg')
                result = await proc.saveToFile(mp3,  function(stdout, stderr){
                  return "success"
                })
              console.log('next')
              var mimetype_ = "audio/mpeg3"
              var readStream = fs.createReadStream("audio.mp3")
              var result = await getMessagefromAudio(readStream, mimetype_)
              console.log(result)
              var caps= `turning ${result[0][0]} the ${result[1][0]}`
              console.log(caps)
              // client.sendText(from, caps)
              if(result[0][0]=='on'){
                listen.publish(topic, "1");
                console.log(`${result[0][0]}, ${topic}`);
                }else{
                listen.publish(topic, "0");
                console.log(`${result[0][0]}, ${topic}`);
                }
              
              

                



              });
                
                            
                        

            }
        });
      response = {
        "text": `audio message`
      }
    }

    // Send the response message
    // callSendAPI(sender_psid, response);    
    
  },

  handlePostback: async function(sender_psid, received_postback) {
    console.log('ok')
     let response;
    // Get the payload for the postback
    let payload = received_postback.payload;
  
    // Set the response based on the postback payload
    if (payload === 'yes') {
      response = { "text": "Thanks!" }
    } else if (payload === 'no') {
      response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
  }
  
};

async function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v8.0/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

function convert(input, output, callback) {
  ffmpeg(input)
      .output(output)
      .on('end', function() {                    
          console.log('conversion ended');
          callback(null);
      }).on('error', function(err){
          console.log('error: ', e.code, e.msg);
          callback(err);
      }).run();
}

// curl -XPOST 'https://api.wit.ai/speech?v=20200513' \-i -L \-H "Authorization: Token" \-H "Content-Type: audio/mpeg3" \--data-binary "@./input/turn.mp3"

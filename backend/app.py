from flask import Flask, request, jsonify
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import numpy as np
from flask_cors import CORS
import socket
import atexit

# initialize flask app
app = Flask(__name__)

# allow for cross origin requests
CORS(app)

# load pretrained keras model for garbage classification of images
model = keras.models.load_model('ResNet50V2_garbage_classifier_4_unfreeze20.keras')

# create a socket to connect to ESP32 server
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

ip_addr = '**********'  # Fill in based on ESP32 server IP address
port_num = 80           # Fill in based on ESP32 server port
server_address = (ip_addr, port_num)

print(f"Connecting to {server_address[0]} port {server_address[1]}...")
sock.connect(server_address)    # connect to esp32 server

# map predicted index from one-hot encoding to class label
class_dict = {
    0: 'bandaids', 
    1: 'battery', 
    2: 'biological', 
    3: 'bowls-and-dishes', 
    4: 'cardboard', 
    5: 'cigarette-butts', 
    6: 'clothes', 
    7: 'diapers', 
    8: 'electrical-cables', 
    9: 'glass', 
    10: 'gloves', 
    11: 'laptops', 
    12: 'lightbulbs', 
    13: 'masks', 
    14: 'medicine', 
    15: 'medicine-bottles', 
    16: 'metal', 
    17: 'nailpolish-bottle', 
    18: 'napkins', 
    19: 'paper', 
    20: 'paper-cups', 
    21: 'pens', 
    22: 'plastic', 
    23: 'plastic-bags', 
    24: 'rags', 
    25: 'shoes', 
    26: 'small-appliances', 
    27: 'smartphones', 
    28: 'syringe', 
    29: 'tetra-pak', 
    30: 'toothbrush', 
    31: 'toothpicks-and-chopsticks'
}

# map predicted index from one hot encoding to bin category
class_category = {
    0: 'garbage', 
    1: 'garbage', 
    2: 'organics', 
    3: 'garbage', 
    4: 'recycling', 
    5: 'garbage', 
    6: 'garbage', 
    7: 'garbage', 
    8: 'garbage', 
    9: 'recycling', 
    10: 'garbage', 
    11: 'garbage', 
    12: 'garbage', 
    13: 'garbage', 
    14: 'garbage', 
    15: 'garbage', 
    16: 'recycling', 
    17: 'garbage', 
    18: 'garbage', 
    19: 'recycling', 
    20: 'garbage', 
    21: 'garbage', 
    22: 'recycling', 
    23: 'recycling', 
    24: 'garbage', 
    25: 'garbage', 
    26: 'garbage', 
    27: 'garbage', 
    28: 'garbage', 
    29: 'recycling', 
    30: 'garbage', 
    31: 'garbage'
}

# map each bin category to server specific open message
open_message = {
    'garbage' : 'OPEN_GARBAGE',
    'recycling' : 'OPEN_RECYCLING',
    'organics' : 'OPEN_ORGANICS'
}

# map each bin catgeory to server specific close message
close_message = {
    'garbage' : 'CLOSE_GARBAGE',
    'recycling' : 'CLOSE_RECYCLING',
    'organics' : 'CLOSE_ORGANICS'
}

# load and preprocess uploaded image for model prediction
def load_and_preprocess_image(req_image):
    image = Image.open(req_image).convert('RGB')
    image = image.resize((224, 224))
    image = np.expand_dims(image, axis=0)
    return image

# send a message to the ESP32 server and return the response
def send_message(message):
    print(f"Sending message: {message}")
    sock.sendall(bytes(message, 'utf-8'))

    message_recv = ""

    # wait for response from server
    while not message_recv or message_recv[-1] != '\n':
        data = sock.recv(1600)  # receive data in chunks of 1600 bytes
        message_recv += str(data, 'UTF-8')

    print(message_recv)
    return message_recv

# classify the uploaded image recived from the front end
# open bin based on form recieved from front end
@app.route("/classify", methods=['POST'])
def classify():
    print('Req recieved')

    # get image to classify and if bin should be opened
    req_image = request.files['image']
    req_open = request.form.get('open')
    # print('req_open', req_open)

    # preprocess and predict the class of the items in the image
    processed_image = load_and_preprocess_image(req_image)
    predictions = model.predict(processed_image)
    predicted_class = np.argmax(predictions[0])     
    # print(predicted_class)

    bin_category = class_category[predicted_class]  # get bin category
    # print(bin_category)
    
    # only open bin if "open" key in form is "true"
    if req_open == "true":
        send_message(open_message[bin_category])

    # return the prediction as JSON to frontend
    return jsonify({"prediction": bin_category,
                    "class": class_dict[predicted_class]})

# close all bins by sending messages to ESP32 server
@app.route("/close_bins", methods=['POST'])
def close_bins():
    try:
        # send close message to server for all bin categories
        send_message(close_message['garbage'])
        send_message(close_message['recycling'])
        send_message(close_message['organics'])

        return jsonify("Closed all bins."), 200  # Return success response
    
    except Exception as e:
        # Handle errors and return failure response
        return jsonify({"status": "error", "message": str(e)}), 500

# close client on shutdown
def shutdown():
    print("Closing client...")
    sock.close()

# register shutdown function to run on program exit
atexit.register(shutdown)
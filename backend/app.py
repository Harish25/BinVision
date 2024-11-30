from flask import Flask
from flask import request
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import numpy as np
from flask_cors import CORS
from flask import jsonify
import socket
import atexit

app = Flask(__name__)
CORS(app)

#model = keras.models.load_model('../../Models/effNetFineTuned_93_10ep_augment_batch32.keras')
model = keras.models.load_model('effNetFineTuned_93_10ep_augment_batch32.keras')

# connect to server
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

server_address = ('192.168.0.28', 80)
print(f"Connecting to {server_address[0]} port {server_address[1]}...")
sock.connect(server_address)


class_category = {
    0: 'garbage',
    1: 'organics',
    2: 'recycling',
    3: 'recycling',
    4: 'garbage',
    5: 'recycling',
    6: 'recycling',
    7: 'recycling',
    8: 'recycling',
    9: 'garbage',
    10: 'garbage',
    11: 'recycling'
}

class_dict = {
    0: 'battery',
    1: 'biological',
    2: 'brown-glass',
    3: 'cardboard',
    4: 'clothes',
    5: 'green-glass',
    6: 'metal',
    7: 'paper',
    8: 'plastic',
    9: 'shoes',
    10: 'trash',
    11: 'white-glass'
}

open_message = {
    'garbage' : 'OPEN_GARBAGE',
    'recycling' : 'OPEN_RECYCLING',
    'organics' : 'OPEN_ORGANICS'
}

close_message = {
    'garbage' : 'CLOSE_GARBAGE',
    'recycling' : 'CLOSE_RECYCLING',
    'organics' : 'CLOSE_ORGANICS'
}

def load_and_preprocess_image(req_image):
    image = Image.open(req_image).convert('RGB')
    image = image.resize((224, 224))
    image = np.expand_dims(image, axis=0)
    return image

def send_message(message):
    print(f"Sending message: {message}")
    sock.sendall(bytes(message, 'utf-8'))

    message_recv = ""

    # wait for response from server
    while not message_recv or message_recv[-1] != '\n':
        data = sock.recv(1600)
        message_recv += str(data, 'UTF-8')

    print(message_recv)
    return message_recv

@app.route("/classify", methods=['POST'])
def classify():
    print('Req recieved')
    req_image = request.files['image']
    req_open = request.form.get('open')
    # print('req_open', req_open)

    processed_image = load_and_preprocess_image(req_image)
    predictions = model.predict(processed_image)
    predicted_class = np.argmax(predictions[0])
    bin_category = class_category[predicted_class]
    
    if req_open == "true":
        send_message(open_message[bin_category])

    #print(class_category[predicted_class])
    return jsonify({"prediction": bin_category,
                    "class": class_dict[predicted_class]})

@app.route("/close_bins", methods=['POST'])
def close_bins():
    try:
        send_message(close_message['garbage'])
        send_message(close_message['recycling'])
        send_message(close_message['organics'])
        return jsonify("Closed all bins."), 200  # Return success response
    except Exception as e:
        # Handle errors (e.g., hardware or internal issues)
        return jsonify({"status": "error", "message": str(e)}), 500

def shutdown():
    print("Closing client...")
    sock.close()

atexit.register(shutdown)
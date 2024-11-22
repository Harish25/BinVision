from flask import Flask
from flask import request
import tensorflow as tf
from tensorflow import keras
from PIL import Image
import numpy as np
from flask_cors import CORS
from flask import jsonify

app = Flask(__name__)
CORS(app)

#model = keras.models.load_model('../../Models/effNetFineTuned_93_10ep_augment_batch32.keras')
model = keras.models.load_model('effNetFineTuned_93_10ep_augment_batch32.keras')

dictionary = {
    0: 'garbage',
    1: 'compost',
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

def load_and_preprocess_image(req_image):
    image = Image.open(req_image).convert('RGB')
    image = image.resize((224, 224))
    image = np.expand_dims(image, axis=0)
    return image

@app.route("/classify", methods=['POST'])
def classify():
    print('Req recieved')
    req_image = request.files['image']
    processed_image = load_and_preprocess_image(req_image)
    predictions = model.predict(processed_image)
    predicted_class = np.argmax(predictions[0]) 
    #print(dictionary[predicted_class])
    return jsonify({"prediction": dictionary[predicted_class],
                    "class": class_dict[predicted_class]})


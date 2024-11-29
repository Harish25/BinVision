import "./App.css";
import { useState } from "react";

function App() {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictedDataset, setPredictedDataset] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);  // To store the image preview URL
  const [isModalOpen, setIsModalOpen] = useState(false);  // To control the modal visibility

  const classify = async (e) => {
    e.preventDefault();

    const imgFormData = new FormData();
    imgFormData.append("image", image);

    try {
      const response = await fetch("http://127.0.0.1:5000/classify", {
        method: "POST",
        body: imgFormData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setPrediction(data.prediction);
        setPredictedDataset(data.class);
        setIsModalOpen(true); // Open the modal after prediction
      } else {
        throw new Error("err");
      }
    } catch (err) {
      console.error("err: ", err.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);  // Close the modal
  };

  // Set image preview URL when the user selects a file
  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];
    setImage(selectedImage);
    setImagePreview(URL.createObjectURL(selectedImage)); // Generate a preview URL
  };

  return (
    <div className="App">
      {/* Title - BinVision */}
      <h1 className="app-title">BinVision</h1>

      <form onSubmit={classify} className="image-form">
        <label className="image-label">Enter image:</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleImageChange}
          className="image-input"
        />
        <input type="submit" className="submit-btn" />
      </form>

      {/* Modal for displaying the prediction results */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Prediction Result</h2>
            {/* Display uploaded image */}
            <div className="image-preview">
              <img src={imagePreview} alt="Uploaded" />
            </div>
            <p><strong>The image goes in:</strong> {prediction}</p>
            <p><strong>This image is classified as:</strong> {predictedDataset}</p>
            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

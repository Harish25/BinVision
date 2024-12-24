import "./App.css";
import { useState, useRef, useEffect } from "react";

function App() {
  const [image, setImage] = useState(null);   // store uploaded image
  const [prediction, setPrediction] = useState(null);   // store predicted bin category
  const [predictedDataset, setPredictedDataset] = useState(null);   // store predicted class
  const [imagePreview, setImagePreview] = useState(null);  // store image preview URL for modal display
  const [isModalOpen, setIsModalOpen] = useState(false);  // control the modal visibility
  const isModalOpenRef = useRef(isModalOpen); // ensure captureAndClassify gets latest state
  const [isWebcamMode, setIsWebcamMode] = useState(false); // toggle between webcam and image upload

  // refs for video and canvas elements
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  let streamRef = useRef(null); // ref to hold the webcam stream
  

  // update ref when isModalOpen changes
  useEffect(() => {
    console.log("isModalOpen updated: ", isModalOpen);
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);


  // manage webcam stream and capture frames
  useEffect(() => {
    let intervalId;

    // Start webcam stream when switching to webcam mode
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Start periodic frame capture
        intervalId = setInterval(() => {
          captureAndClassify();
        }, 1000);

      } catch (err) {
        alert("Unable to access webcam. Please check your device settings.");
        console.error("Error accessing webcam: ", err);
      }
    };
    
    // Stop webcam stream when switching to upload mode
    const stopWebcam = () => {
      const stream = streamRef.current;

      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };

    if (isWebcamMode) {
      startWebcam();
    } else {
      stopWebcam();
    }

    // cleanup 
    return () => {
      stopWebcam();
      clearInterval(intervalId);
    };
  }, [isWebcamMode]);


  // classify uploaded image or webcam frame
  const classify = async (e) => {
    if (e) e.preventDefault();

    // Check if an image has been selected if in upload mode
    if (!image && !isWebcamMode) {
      alert("Please select an image.");
      return;
    }

    try {
      const imgFormData = new FormData();

      if (!isWebcamMode) {
        imgFormData.append("image", image);
      }
      else {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (!canvas || !video) return;

        // draw current from from video to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // set url for image preview in modal view
        const blob = await getBlobFromCanvas(canvas);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setImagePreview(dataUrl);

        // send webcam frame to backend for classification
        imgFormData.append("image", blob, "webcam-frame.jpg");
      }
      
      // open the bin after classification
      imgFormData.append("open", "true");

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


  // convert canvas content into a blob
  const getBlobFromCanvas = (canvas) => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to capture image from webcam."));
        }
      }, "image/jpeg");
    });
  };


  // capture and classify images from webcam
  const captureAndClassify = async () => {
    console.log(isModalOpenRef.current);
    if (!isWebcamMode || isModalOpenRef.current) return;

    // get references to canvas and video elements
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    // set canvas dimensions to video frame dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // draw the current video frame
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // send canvas to be classified and update states
    try {
      const blob = await getBlobFromCanvas(canvas);
      
      // Send webcam frame to backend for classification
      const imgFormData = new FormData();
      imgFormData.append("image", blob, "webcam-frame.jpg");
      imgFormData.append("open", "false");
     
      
      const response = await fetch("http://127.0.0.1:5000/classify", {
        method: "POST",
        body: imgFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setPrediction(data.prediction);
        setPredictedDataset(data.class);
      } else {
        console.error("Failed to classify frame.");
      }
    } catch (err) {
      console.error("Error during classification:", err.message);
    }
  };


  // close modal and reset predictions
  const closeModal = () => {
    setIsModalOpen(false);
    setPrediction(null);
    setPredictedDataset(null);
  };


  // handle file input changes by updating states
  const handleImageChange = (e) => {
    const selectedImage = e.target.files[0];

    if (selectedImage && selectedImage.type.startsWith('image/')) {
      setImage(selectedImage);
      setImagePreview(URL.createObjectURL(selectedImage));
    } else {
      alert("Please select a valid image file.");
    }
  };


  // send API call to close all bins
  const closeBins = async () => {

    try {
      const response = await fetch("http://127.0.0.1:5000/close_bins", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
      } else {
        const errorData = await response.json();
        console.error("Error:", errorData.message);
      }
    } catch (error) {
      console.error("Network error:", error.message);
    }
  };


  // toggle between webcam and image upload modes
  const toggleMode = () => {
    setIsWebcamMode(!isWebcamMode);
    setImage(null);
    setPrediction(null);
    setPredictedDataset(null);
  };

  return (
    <div className="App">
      {/* Title - BinVision */}
      <h1 className="app-title">BinVision</h1>

      {/* Mode Toggle Button */}
      <button onClick={toggleMode} className="gray-btn">
        {isWebcamMode ? "Switch to Upload Mode" : "Switch to Webcam Mode"}
      </button>

      {/* Display either webcam or file upload mode*/}
      {isWebcamMode ? (
        <>
          <video className="video" ref={videoRef} autoPlay muted></video>
          <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
          
          {prediction && (
            <div className="prediction-display">
              <p><strong>Goes in as:</strong> {prediction}</p>
              <p><strong>Classified as:</strong> {predictedDataset}</p>

              <button className="blue-btn" onClick={classify}>Open Bin</button>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={classify} className="image-form">
          <label className="image-label">Enter image:</label>

          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            className="image-input"
          />
          
          <input type="submit" className="blue-btn" />
        </form>
      )}

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

            <button onClick={() => {closeModal(); closeBins();}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

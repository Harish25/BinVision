import "./App.css";
import { useState } from "react";

function App() {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictedDataset, setPredictedDataset] = useState(null);

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
      } else {
        throw new Error("err");
      }
    } catch (err) {
      console.error("err: ", err.message);
    }
  };

  return (
    <div className="App">
      <form onSubmit={classify}>
        <label>Enter image:</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={(e) => {
            setImage(e.target.files[0]);
          }}
        ></input>
        <input type="submit" />
      </form>

      <h1>The image goes in: {prediction}</h1>
      <h1>This image is classified as: {predictedDataset}</h1>
    </div>
  );
}

export default App;

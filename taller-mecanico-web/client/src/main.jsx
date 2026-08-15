import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div style={{ height: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      <App />
    </div>
  </React.StrictMode>
);

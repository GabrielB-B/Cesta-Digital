import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter/index.css";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/accessibility.css";
import { ShowcasePage } from "./ShowcasePage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ShowcasePage />
  </React.StrictMode>,
);

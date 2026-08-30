import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/planner-tokens.css";
import "./styles/planner-components.css";
import "./styles/planner-shell.css";
import "./styles/planner-journey.css";
import "./styles/planner-landing.css";
import "./styles/planner-entry.css";
import "./styles/planner-courses.css";
import "./styles/planner-results.css";
import "./styles/planner-recommendations.css";
import "./styles/planner-planning.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

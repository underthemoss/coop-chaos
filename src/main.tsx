import { createRoot } from "react-dom/client";
import { FrontDoor } from "./app/FrontDoor";
import "./app/styles.css";

createRoot(document.getElementById("root")!).render(<FrontDoor />);

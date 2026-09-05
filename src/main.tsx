import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Giralata } from "./giralata/Giralata";
import "./styles.css";

/**
 * Rotas:
 *  - `/giralata`, `#/giralata`, `?game=giralata` ou `?demo=giralata*` abrem o
 *    minijogo Giralata isolado do restante da demo.
 *  - `VITE_DEFAULT_GAME=giralata` (bundle Android) abre o Giralata como
 *    experiência padrão, em modo embutido.
 */
function pickRoute(): React.ReactElement {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get("demo");
  const embedded = import.meta.env.VITE_DEFAULT_GAME === "giralata";
  const path = window.location.pathname.replace(/\/+$/, "");
  const wantsGiralata =
    embedded ||
    path.endsWith("/giralata") ||
    window.location.hash === "#/giralata" ||
    params.get("game") === "giralata" ||
    (demo !== null && demo.startsWith("giralata"));
  if (wantsGiralata) return <Giralata embedded={embedded} demo={demo} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode>{pickRoute()}</React.StrictMode>);

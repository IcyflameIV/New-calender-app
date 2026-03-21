import React from "react";
import AboutPage from "./pages/AboutPage.jsx";
import MainPage from "./pages/MainPage.jsx";

export default function App() {
  if (window.location.pathname === "/about") {
    return <AboutPage />;
  }

  return <MainPage />;
}

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BeauJeux from "./games/beau-jeux.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/jeux" element={<BeauJeux />} />
      <Route path="/play" element={<Navigate to="/jeux" replace />} />
      <Route path="*" element={<Navigate to="/jeux" replace />} />
    </Routes>
  );
}

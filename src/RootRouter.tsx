import React from 'react';
import { Route, Routes } from 'react-router-dom';
import App from './App';
import AcademyApp from './AcademyApp';

export default function RootRouter() {
  return (
    <Routes>
      <Route path="/academy/*" element={<AcademyApp />} />
      <Route path="/*" element={<App />} />
    </Routes>
  );
}

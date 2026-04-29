import React from 'react';
import { useLocation } from 'react-router-dom';
import App from './App';
import AcademyApp from './AcademyApp';

export default function RootRouter() {
  const location = useLocation();
  const isAcademy = location.pathname.startsWith('/academy');

  return isAcademy ? <AcademyApp /> : <App />;
}

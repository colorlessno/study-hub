import { createBrowserRouter, Navigate } from 'react-router-dom';
import { FieldListPage } from './pages/FieldListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ThemeListPage } from './pages/ThemeListPage';
import { ThemePage } from './pages/ThemePage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/fields" replace /> },
  { path: '/fields', element: <FieldListPage /> },
  { path: '/fields/:fieldId/themes', element: <ThemeListPage /> },
  { path: '/themes/:themeId', element: <ThemePage /> },
  { path: '*', element: <NotFoundPage /> }
]);

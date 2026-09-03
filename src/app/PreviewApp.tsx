import { RouterProvider } from 'react-router';
import { previewRouter } from './previewRouter';

export function PreviewApp() {
  return (
    <>
      <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
      <RouterProvider router={previewRouter} />
    </>
  );
}

import { HomePage } from '@routes/home';
import { LoginPage } from '@routes/login';
import { RootLayout } from '@routes/root';
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
    {
        Component: RootLayout,
        children: [
            { index: true, Component: HomePage },
            { path: 'login', Component: LoginPage },
        ],
    },
]);

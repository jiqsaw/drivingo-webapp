import { createBrowserRouter } from "react-router";
import { RootLayout } from "./routes/root";
import { HomePage } from "./routes/home";
import { LoginPage } from "./routes/login";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "login", Component: LoginPage },
    ],
  },
]);

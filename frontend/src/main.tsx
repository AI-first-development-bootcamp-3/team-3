import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ConfigProvider } from "antd";
import heIL from "antd/locale/he_IL";
import "./services/dayjs";
import "./index.css";
import router from "./routes.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider direction="rtl" locale={heIL}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
);

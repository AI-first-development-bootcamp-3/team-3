import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App } from "antd";
import heIL from "antd/locale/he_IL";
import { queryClient } from "./services/queryClient";
import "./services/dayjs";
import "./index.css";
import router from "./routes.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider direction="rtl" locale={heIL}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App } from "antd";
import heIL from "antd/locale/he_IL";
import { queryClient } from "./services/queryClient";
import { sessionStore } from "./services/sessionStore";
import "./services/dayjs";
import "./index.css";
import router from "./routes.tsx";

sessionStore.getState().rehydrateSession();

const theme = {
  token: {
    fontFamily: "'Assistant', system-ui, sans-serif",
    colorPrimary: "#1b365d",
    colorText: "#111827",
    borderRadius: 12,
    controlHeight: 44,
  },
  components: {
    Button: {
      controlHeight: 48,
      fontWeight: 600,
    },
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider direction="rtl" locale={heIL} theme={theme}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);

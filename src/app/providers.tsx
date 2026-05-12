"use client";

import { AuthProvider } from "@/lib/auth/auth-provider";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { useTheme } from "@/lib/theme/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ConfigProvider, theme as antdTheme } from "antd";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AntdThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </AntdThemeProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#f59e0b",
          borderRadius: 12,
          fontFamily:
            "var(--font-sans-system), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Menu: {
            itemBg: "transparent",
            subMenuItemBg: "transparent",
            itemHeight: 40,
            itemMarginBlock: 2,
            itemMarginInline: 0,
            itemPaddingInline: 12,
            itemBorderRadius: 8,
            iconSize: 16,
            iconMarginInlineEnd: 10,
            groupTitleFontSize: 11,
            groupTitleLineHeight: 1.45,
            groupTitleColor: dark ? "#6b7280" : "#94a3b8",
            itemColor: dark ? "#aeb8c9" : "#475569",
            itemHoverBg: dark ? "rgba(255, 255, 255, 0.055)" : "#f5f7fa",
            itemHoverColor: dark ? "#f8fafc" : "#111827",
            itemSelectedBg: dark ? "rgba(245, 158, 11, 0.15)" : "#fff7e6",
            itemSelectedColor: dark ? "#fbbf24" : "#ad6800",
            darkItemBg: "transparent",
            darkSubMenuItemBg: "transparent",
            darkItemColor: "#aeb8c9",
            darkItemHoverBg: "rgba(255, 255, 255, 0.055)",
            darkItemHoverColor: "#f8fafc",
            darkItemSelectedBg: "rgba(245, 158, 11, 0.15)",
            darkItemSelectedColor: "#fbbf24",
            darkGroupTitleColor: "#6b7280",
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

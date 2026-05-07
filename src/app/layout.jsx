import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Exception · 코딩학회",
  description: "Exception 코딩학회 학습 플랫폼",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen text-ink antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-soft-blush" />
        <AuthProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-ink-soft">
            © Exception · Sungshin Women's University Media Communication Dept.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

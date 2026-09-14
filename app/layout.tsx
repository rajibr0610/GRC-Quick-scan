import "./globals.css";

export const metadata = {
  title: "GRC QuickScan",
  description: "10-minute startup security readiness assessment"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
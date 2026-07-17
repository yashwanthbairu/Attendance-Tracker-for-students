import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attendance Tracker",
  description: "Track your class and lab attendance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="pb-16 sm:pb-14">
        {children}
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2">
          <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
            We take reasonable measures to keep your personal information secure. However, we are not
            liable for any loss of data resulting from unauthorized access, hacking, or other events
            beyond our control.
          </p>
        </footer>
      </body>
    </html>
  );
}
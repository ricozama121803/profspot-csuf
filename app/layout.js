import { Inter } from "next/font/google";
import "./globals.css";
import { PinProvider } from "./pinned";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ProfSpot CSUF",
  description: "AI-powered professor search for Cal State Fullerton students",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PinProvider>{children}</PinProvider>
      </body>
    </html>
  );
}

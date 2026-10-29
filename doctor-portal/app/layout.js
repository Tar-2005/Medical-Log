import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { PatientProvider } from '../context/PatientContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Health Memory Layer | Provider Dashboard',
  description: 'Patient-Centric Longitudinal Health Memory Layer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-text-primary antialiased selection:bg-primary/30">
        <AuthProvider>
          <PatientProvider>
            {children}
          </PatientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

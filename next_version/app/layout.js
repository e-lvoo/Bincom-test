import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: { default: 'Delta Results · 2011 Election Archive', template: '%s · Delta Results' },
  description: 'Explore Delta State 2011 polling unit and local government election results.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header><Nav /></header>
        <main>{children}</main>
      </body>
    </html>
  );
}

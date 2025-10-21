import './globals.css';

export const metadata = {
  title: 'Cachito',
  description: 'Peruvian Liar\'s Dice game',
  icons: {
    icon: '/dice-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

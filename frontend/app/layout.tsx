import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        default: 'Word Assassins',
        template: '%s · Word Assassins',
    },
    description: 'Real-time party word game: create or join a room and play!',
    icons: {
        icon: [
            { url: '/icon.svg', type: 'image/svg+xml' },
            { url: '/favicon.ico', sizes: 'any' },
        ],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <header>
                    <div className="max-w-3xl mx-auto px-4">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Word Assassins</h1>
                    </div>
                </header>
                <main>{children}</main>
            </body>
        </html>
    );
}

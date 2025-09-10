import './globals.css';

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

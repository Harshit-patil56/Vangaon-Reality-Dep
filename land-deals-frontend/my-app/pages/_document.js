import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon configurations */}
        <link rel="icon" href="/vangaon-logo.svg" type="image/svg+xml" />
        <link rel="icon" href="/vangaon-logo.svg" sizes="any" />
        <link rel="apple-touch-icon" href="/vangaon-logo.svg" />
        <link rel="mask-icon" href="/vangaon-logo.svg" color="#28652F" />
        
        {/* Meta tags */}
        <meta name="theme-color" content="#28652F" />
        <meta name="msapplication-TileColor" content="#28652F" />
        <meta name="application-name" content="Vangaon Reality" />
        <meta name="apple-mobile-web-app-title" content="Vangaon Reality" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
const content = `# ScoreTransposer

> ScoreTransposer is a web application for turning sheet-music PDFs and images into reviewable digital notation, then correcting, converting, transposing, practicing, and exporting the score.

## Public entry points
- App overview: https://app.scoretransposer.com/
- Sign in: https://app.scoretransposer.com/login
- Create an account: https://app.scoretransposer.com/register
- Product website: https://www.scoretransposer.com/
- About: https://www.scoretransposer.com/about
- Support: https://www.scoretransposer.com/support
- Privacy: https://www.scoretransposer.com/privacy

## Product facts
- A new account can recognize one PDF page or one score image for free.
- Recognition results require human review, especially for complex, blurry, or handwritten notation.
- Users can correct notes, convert staff and numbered notation, transpose, practice with playback, and export common formats.
- Google and email/password account access are supported when the deployment's Google OAuth client is configured.
- The user's approved score version remains the reference; recognition does not silently replace it.

## Contact
- Support: support@scoretransposer.com
- Last updated: 2026-08-19
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

const content = `# ScoreTransposer

> ScoreTransposer is a web application for turning sheet-music PDFs and images into reviewable digital notation, then correcting, converting, transposing, practicing, and exporting the score.

## Public entry points
- App overview: https://app.scoretransposer.com/
- Sign in: https://app.scoretransposer.com/login
- Create an account: https://app.scoretransposer.com/register
- Product website: https://scoretransposer.com/
- About: https://scoretransposer.com/about
- Support: https://scoretransposer.com/support
- Privacy: https://scoretransposer.com/privacy

## Product facts
- A Free account can create one complete score project from one complete multi-page staff-score PDF or one score image. That project includes the currently available correction, playback, transposition, Jianpu, version, sharing, and export tools; paid plans add processing and storage capacity.
- Recognition results require human review, especially for complex, blurry, or handwritten notation.
- Users can correct notes, convert staff and numbered notation, transpose, practice with playback, and export common formats.
- Google and email/password account access are supported when the deployment's Google OAuth client is configured.
- The user's approved score version remains the reference; recognition does not silently replace it.

## Contact
- Support: support@scoretransposer.com
- Last updated: 2026-08-25
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

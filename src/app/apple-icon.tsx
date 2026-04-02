/**
 * Route-based Apple Touch Icon generation (Next.js file convention).
 * 180x180 chartreuse "D" on dark ground for iOS home-screen bookmarks.
 * Serves at /apple-icon — replaces static apple-touch-icon.png.
 */
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const spaceGroteskBold = readFileSync(
    join(process.cwd(), "public/fonts/SpaceGrotesk-Bold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A1D23",
          borderRadius: "12%",
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: "#C8FF00",
            fontFamily: "Space Grotesk",
            lineHeight: 1,
          }}
        >
          D
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Space Grotesk",
          data: spaceGroteskBold,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}

/**
 * Route-based favicon generation (Next.js file convention).
 * Renders the v2 Speculative Interface favicon: bold chartreuse "D" on dark ground.
 * Serves at /icon — replaces static favicon PNGs.
 */
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 22,
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

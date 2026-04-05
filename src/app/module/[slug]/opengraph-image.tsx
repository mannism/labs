/**
 * Per-project OG social preview image.
 * Renders project title + category badge on the v2 dark/chartreuse canvas.
 * Next.js auto-associates this with each /module/[slug] page.
 */
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { Project } from "@/types/project";
import projectsData from "@/lib/projects";

const projects = projectsData as Project[];

export const alt = "Labs by Diana — project detail";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects
    .filter((p) => p.display !== false)
    .map((p) => ({ slug: p.slug }));
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  const title = project?.title ?? "Project";
  const category = project?.category ?? "";
  const isArticle = project?.type === "article";
  const label = isArticle ? "ARTICLE" : "MODULE";

  const spaceGroteskBold = readFileSync(
    join(process.cwd(), "public/fonts/SpaceGrotesk-Bold.ttf")
  );
  const openSansRegular = readFileSync(
    join(process.cwd(), "public/fonts/OpenSans-Regular.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#1A1D23",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 100px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background orb — chartreuse */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: 100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200,255,0,0.10) 0%, transparent 70%)",
          }}
        />
        {/* Background orb — secondary glow */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: 300,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(200,255,0,0.05) 0%, transparent 70%)",
          }}
        />

        {/* Badge — category + type */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(200,255,0,0.10)",
              border: "1px solid rgba(200,255,0,0.25)",
              borderRadius: 9999,
              padding: "8px 20px",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#C8FF00",
              }}
            />
            <span
              style={{
                fontFamily: "Open Sans",
                fontSize: 18,
                color: "#C8FF00",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {category}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9999,
              padding: "8px 20px",
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans",
                fontSize: 18,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.12em",
              }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* Project title */}
        <div
          style={{
            fontFamily: "Space Grotesk",
            fontSize: title.length > 30 ? 56 : 72,
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1.1,
            marginBottom: 28,
            maxWidth: 1000,
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>

        {/* Subtitle — Labs branding */}
        <div
          style={{
            fontFamily: "Open Sans",
            fontSize: 24,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.04em",
          }}
        >
          Labs by Diana Ismail
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Space Grotesk",
          data: spaceGroteskBold,
          style: "normal" as const,
          weight: 700 as const,
        },
        {
          name: "Open Sans",
          data: openSansRegular,
          style: "normal" as const,
          weight: 400 as const,
        },
      ],
    }
  );
}

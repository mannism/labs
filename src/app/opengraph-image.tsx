/**
 * OG social preview image — v2 Speculative Interface direction.
 * Chartreuse accent on dark ground with Space Grotesk typography.
 * Serves at /opengraph-image — auto-detected by Next.js metadata.
 */
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Labs by Diana — Speculative interface and AI experiments. Built by Diana Ismail, agentic AI builder.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
    const spaceGroteskBold = readFileSync(join(process.cwd(), "public/fonts/SpaceGrotesk-Bold.ttf"));
    const openSansRegular  = readFileSync(join(process.cwd(), "public/fonts/OpenSans-Regular.ttf"));

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
                        background: "radial-gradient(circle, rgba(200,255,0,0.10) 0%, transparent 70%)",
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
                        background: "radial-gradient(circle, rgba(200,255,0,0.05) 0%, transparent 70%)",
                    }}
                />

                {/* Badge */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 9999,
                        padding: "8px 20px",
                        marginBottom: 40,
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
                            color: "rgba(255,255,255,0.5)",
                            letterSpacing: "0.12em",
                        }}
                    >
                        {"// Labs by Diana"}
                    </span>
                </div>

                {/* Headline */}
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "baseline",
                        fontFamily: "Space Grotesk",
                        fontSize: 80,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        lineHeight: 1.1,
                        marginBottom: 28,
                        maxWidth: 900,
                    }}
                >
                    <span>{"Labs by Diana — "}</span>
                    <span style={{ color: "#C8FF00" }}>Experiments that ship.</span>
                </div>

                {/* Subtitle */}
                <div
                    style={{
                        fontFamily: "Open Sans",
                        fontSize: 26,
                        color: "rgba(255,255,255,0.5)",
                        maxWidth: 700,
                        lineHeight: 1.5,
                    }}
                >
                    Creative coding, agentic AI, and speculative interface design. All live.
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                { name: "Space Grotesk", data: spaceGroteskBold, style: "normal" as const, weight: 700 as const },
                { name: "Open Sans", data: openSansRegular, style: "normal" as const, weight: 400 as const },
            ],
        }
    );
}

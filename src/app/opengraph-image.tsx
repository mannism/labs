import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "Labs by Diana — AI experiments, all live. Built by Diana Ismail.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
    // Fonts are bundled locally in public/fonts/ — no CDN dependency at runtime.
    const merriweatherBold = readFileSync(join(process.cwd(), "public/fonts/Merriweather-Bold.ttf"));
    const openSansRegular  = readFileSync(join(process.cwd(), "public/fonts/OpenSans-Regular.ttf"));

    return new ImageResponse(
        (
            <div
                style={{
                    width: 1200,
                    height: 630,
                    background: "#0A0A0F",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "80px 100px",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Background orb — blue */}
                <div
                    style={{
                        position: "absolute",
                        top: -100,
                        right: 100,
                        width: 500,
                        height: 500,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
                    }}
                />
                {/* Background orb — purple */}
                <div
                    style={{
                        position: "absolute",
                        bottom: -80,
                        right: 300,
                        width: 400,
                        height: 400,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
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
                            background: "#22C55E",
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
                        fontFamily: "Merriweather",
                        fontSize: 80,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        lineHeight: 1.1,
                        marginBottom: 28,
                        maxWidth: 900,
                    }}
                >
                    Labs by Diana —{" "}
                    <span style={{ color: "#3B82F6" }}>Experiments that ship.</span>
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
                    Side projects that got out of hand. AI tools built for problems I kept tripping over.
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                { name: "Merriweather", data: merriweatherBold, style: "normal", weight: 700 },
                { name: "Open Sans", data: openSansRegular, style: "normal", weight: 400 },
            ],
        }
    );
}

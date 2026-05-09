import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1320",
        }}
      >
        <div
          style={{
            width: 110,
            height: 55,
            background: "#e27a4a",
            borderRadius: "55px 55px 0 0",
          }}
        />
        <div style={{ height: 4 }} />
        <div
          style={{
            width: 144,
            height: 2,
            background: "#8cb0ff",
            opacity: 0.5,
          }}
        />
        <div style={{ height: 4 }} />
        <div
          style={{
            width: 110,
            height: 55,
            background: "#e27a4a",
            opacity: 0.55,
            borderRadius: "0 0 55px 55px",
          }}
        />
      </div>
    ),
    { ...size },
  );
}

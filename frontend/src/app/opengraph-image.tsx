import { ImageResponse } from "next/og";
export const alt = "Seatwise. Find your class. Hold your place.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#172740", color: "#FFFFFF" }}>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#BED0FF" }}>Seatwise</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.08, fontWeight: 700, letterSpacing: -4 }}><span>Find your class.</span><span>Hold your place.</span></div>
      <div style={{ display: "flex", paddingTop: 24, borderTop: "2px solid #52617A", fontSize: 24, color: "#C2CEDE" }}>School admissions, clearly.</div>
    </div>, size,
  );
}

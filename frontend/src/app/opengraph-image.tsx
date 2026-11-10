import { ImageResponse } from "next/og";
export const alt = "Seatwise. Find your class. Hold your place.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#F2F5F3", color: "#183E3B" }}>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>Seatwise</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1.08, fontWeight: 700, letterSpacing: -4 }}><span>Find your class.</span><span>Hold your place.</span></div>
      <div style={{ display: "flex", paddingTop: 24, borderTop: "2px solid #D5DFDA", fontSize: 24 }}>School admissions, clearly.</div>
    </div>, size,
  );
}

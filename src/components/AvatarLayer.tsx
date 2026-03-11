export default function AvatarLayer() {
  return (
    <div className="background-layer">
      <video
        className="background-video"
        src="/publicww.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="background-overlay" />
    </div>
  );
}

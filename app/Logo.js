// Logo in a round clay badge. The PNG has a white background, so it is cropped inside a light circle.
export default function Logo({ size = 56 }) {
  return (
    <div
      className="clay"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#fff',
        backgroundImage: "url('/logo-small.png')",
        backgroundSize: '170%',
        backgroundPosition: 'center 40%',
        backgroundRepeat: 'no-repeat',
        flexShrink: 0,
      }}
      role="img"
      aria-label="ProfSpot CSUF logo"
    />
  );
}

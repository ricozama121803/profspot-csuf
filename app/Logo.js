// The logo is already a round badge, so it is shown as-is with a soft clay-style drop shadow.
export default function Logo({ size = 56 }) {
  return (
    <img
      src="/logo.png"
      alt="ProfSpot CSUF logo"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        filter: 'drop-shadow(5px 6px 8px rgba(0, 55, 103, 0.3)) drop-shadow(-3px -3px 6px rgba(255, 255, 255, 0.9))',
      }}
    />
  );
}

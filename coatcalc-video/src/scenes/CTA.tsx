import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { colors, fonts } from '../theme';
import { FadeIn } from '../components/FadeIn';

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ fps, frame, config: { damping: 15, stiffness: 80 } });

  // Button pulse
  const pulsePhase = Math.sin((frame - 90) * 0.08);
  const buttonScale = frame > 90 ? 1 + pulsePhase * 0.03 : 0;
  const buttonOpacity = spring({ fps, frame: frame - 90, config: { damping: 20 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.navy,
        fontFamily: fonts.body,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${colors.teal}10 0%, transparent 60%)`,
        }}
      />

      {/* Logo */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 40 }}>
        <Img src={staticFile('coatcalc-logo-final.png')} style={{ height: 100 }} />
      </div>

      {/* Price */}
      <FadeIn delay={20} direction="up">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 500, color: colors.gray, fontFamily: fonts.display }}>
            Starting at
          </span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 96, fontWeight: 700, color: colors.gold, fontFamily: fonts.display }}>
            $29
          </span>
          <span style={{ fontSize: 36, fontWeight: 500, color: colors.gray, fontFamily: fonts.display }}>
            /mo
          </span>
        </div>
      </FadeIn>

      <FadeIn delay={40} direction="up">
        <div style={{ fontSize: 24, color: colors.gray, textAlign: 'center', marginBottom: 48 }}>
          Your whole team. Unlimited bids.
        </div>
      </FadeIn>

      {/* Free trial line */}
      <FadeIn delay={60} direction="up">
        <div style={{ fontSize: 28, color: colors.white, textAlign: 'center', marginBottom: 40, fontWeight: 600 }}>
          14 days free. No credit card.
        </div>
      </FadeIn>

      {/* CTA Button */}
      <div
        style={{
          opacity: buttonOpacity,
          transform: `scale(${buttonScale || buttonOpacity})`,
          backgroundColor: colors.gold,
          padding: '20px 64px',
          borderRadius: 8,
          marginBottom: 40,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 700, color: colors.navy, fontFamily: fonts.display, textTransform: 'uppercase', letterSpacing: 3 }}>
          Start Free Trial
        </span>
      </div>

      {/* URL */}
      <FadeIn delay={110} direction="up">
        <div style={{ fontSize: 32, color: colors.teal, fontWeight: 600, fontFamily: fonts.display, letterSpacing: 2 }}>
          www.coatcalc.com
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};

"use client";

import Image from "next/image";
import styled from "styled-components";

const Frame = styled.span`
  display: inline-flex;
  line-height: 0;
`;

type LogoProps = {
  size?: number;
  decorative?: boolean;
  alt?: string;
};

export default function Logo({
  size = 22,
  decorative = false,
  alt = "Mnemo",
}: LogoProps) {
  return (
    <Frame>
      <Image
        src="/logo.png"
        width={size}
        height={size}
        alt={decorative ? "" : alt}
        aria-hidden={decorative || undefined}
        priority
      />
    </Frame>
  );
}

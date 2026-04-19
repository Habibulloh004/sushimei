"use client";

import BoringAvatar from 'boring-avatars';
import { getAccountAvatarSeed } from './account-utils';

const ACCOUNT_AVATAR_COLORS = ['#F8F3EE', '#E7DED1', '#D33B36', '#1E1E1E', '#AFA08C'];

type AccountGeneratedAvatarProps = {
  seed?: string | null;
  size: number;
  square?: boolean;
  className?: string;
};

export function AccountGeneratedAvatar({
  seed,
  size,
  square = false,
  className,
}: AccountGeneratedAvatarProps) {
  return (
    <BoringAvatar
      size={size}
      name={getAccountAvatarSeed(seed)}
      variant="beam"
      colors={ACCOUNT_AVATAR_COLORS}
      square={square}
      className={className}
    />
  );
}

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * 🍱 BentoBoxIcon: Multi-compartment traditional Japanese lacquer lunchbox
 */
export const BentoBoxIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Outer Lacquer Box Body */}
    <rect x="3" y="6" width="26" height="21" rx="4" fill="#E03131" stroke="#FF8787" strokeWidth="1.5" />
    <rect x="4.5" y="7.5" width="23" height="18" rx="2.5" fill="#1E1A25" stroke="#332B40" strokeWidth="1" />

    {/* Compartment Dividers */}
    <line x1="15" y1="7.5" x2="15" y2="25.5" stroke="#E03131" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15" y1="16.5" x2="27.5" y2="16.5" stroke="#E03131" strokeWidth="1.5" strokeLinecap="round" />

    {/* Left Compartment: Onigiri Rice & Sesame */}
    <path
      d="M9 11.5C9.8 10 10.2 10 11 11.5L13.2 15C13.8 16 13.2 17 12 17H8C6.8 17 6.2 16 6.8 15L9 11.5Z"
      fill="#FBF9F5"
    />
    <rect x="8.5" y="14" width="3" height="3" rx="0.5" fill="#152019" />
    <circle cx="10" cy="12.5" r="0.4" fill="#C92A2A" />

    {/* Top-Right Compartment: Tamagoyaki Roll */}
    <rect x="17" y="9.5" width="8.5" height="5" rx="1.5" fill="#FFD43B" stroke="#FAB005" strokeWidth="0.8" />
    <path d="M19.5 10.5C21 10.5 22.5 11.5 22.5 13.5" stroke="#F59F00" strokeWidth="0.8" strokeLinecap="round" />

    {/* Bottom-Right Compartment: Edamame / Veggies */}
    <circle cx="18.5" cy="21" r="2.2" fill="#40C057" />
    <circle cx="23" cy="21.5" r="2" fill="#51CF66" />
    <circle cx="21" cy="19.2" r="1.8" fill="#2F9E44" />

    {/* Steam wisps rising */}
    <path
      d="M10 4C10 2.8 11 2.8 11 1.8"
      stroke="#FF8787"
      strokeWidth="1.2"
      strokeLinecap="round"
      className="animate-steam"
    />
    <path
      d="M21 4C21 2.8 22 2.8 22 1.8"
      stroke="#FFD43B"
      strokeWidth="1.2"
      strokeLinecap="round"
      className="animate-steam"
    />
  </svg>
);

/**
 * 🍙 OnigiriIcon: Joyful triangular rice ball wrapped in nori seaweed
 */
export const OnigiriIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Rice Ball Body */}
    <path
      d="M14.2 6.5C15 5 17 5 17.8 6.5L25.8 21.5C26.7 23.2 25.5 25.5 23.6 25.5H8.4C6.5 25.5 5.3 23.2 6.2 21.5L14.2 6.5Z"
      fill="#FBF9F5"
      stroke="#E5E0D5"
      strokeWidth="1.2"
    />
    {/* Nori Wrap */}
    <path
      d="M11.5 18H20.5V25.5H11.5V18Z"
      fill="#1A241D"
      stroke="#121A14"
      strokeWidth="0.8"
      rx="1"
    />
    {/* Cute Kawaii Face */}
    <circle cx="13" cy="14" r="1.2" fill="#2C2537" />
    <circle cx="19" cy="14" r="1.2" fill="#2C2537" />
    {/* Joyful Mouth */}
    <path d="M15 15.8C15.5 16.5 16.5 16.5 17 15.8" stroke="#2C2537" strokeWidth="0.9" strokeLinecap="round" />
    {/* Pink Blush Cheeks */}
    <circle cx="11" cy="15.5" r="1.2" fill="#FFA8A8" opacity="0.8" />
    <circle cx="21" cy="15.5" r="1.2" fill="#FFA8A8" opacity="0.8" />
    {/* Sesame seeds on top */}
    <circle cx="16" cy="10" r="0.6" fill="#1A241D" />
    <circle cx="17.5" cy="11.5" r="0.6" fill="#1A241D" />
  </svg>
);

/**
 * 🍳 ChefTamagoIcon: Butler kitchen chef tamagoyaki / sizzling pan
 */
export const ChefTamagoIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Frying Pan Handle */}
    <path d="M22 22L28 28" stroke="#ADB5BD" strokeWidth="2.5" strokeLinecap="round" />
    {/* Pan Rim */}
    <circle cx="14" cy="14" r="11" fill="#1E1A25" stroke="#495057" strokeWidth="2" />
    {/* Sizzling Tamago Rolled Omelette */}
    <rect x="8" y="9" width="12" height="10" rx="3" fill="#FFD43B" stroke="#FAB005" strokeWidth="1.2" />
    <path d="M11 11C13 11 17 12 17 14.5C17 17 13 17 11 17" stroke="#F59F00" strokeWidth="1.2" strokeLinecap="round" />
    {/* Chef Hat */}
    <path
      d="M10 6C9 4 11 2.5 14 2.5C17 2.5 19 4 18 6H10Z"
      fill="#FBF9F5"
      stroke="#CED4DA"
      strokeWidth="0.8"
    />
    <rect x="9.5" y="6" width="9" height="1.8" rx="0.5" fill="#E9ECEF" />
    {/* Sizzle Stars */}
    <circle cx="7" cy="7" r="1" fill="#FF8787" />
    <circle cx="21" cy="7" r="1" fill="#FFD43B" />
  </svg>
);

/**
 * 🍵 MatchaCupIcon: Warm frothy matcha green tea bowl for overnight dreaming
 */
export const MatchaCupIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Ceramic Chawan Bowl */}
    <path
      d="M6 12C6 19 10 24 16 24C22 24 26 19 26 12H6Z"
      fill="#262030"
      stroke="#3E3549"
      strokeWidth="1.5"
    />
    {/* Bowl Base Ring */}
    <rect x="12" y="24" width="8" height="2" rx="1" fill="#1E1A25" stroke="#3E3549" strokeWidth="1" />
    {/* Frothy Green Matcha Liquid */}
    <ellipse cx="16" cy="12" rx="10" ry="3.5" fill="#40C057" stroke="#2F9E44" strokeWidth="1" />
    <ellipse cx="16" cy="12" rx="7.5" ry="2.2" fill="#51CF66" />
    {/* Heart Latte/Whisk Foam Art */}
    <path
      d="M16 13C15 11.8 13.5 12 13.5 12.8C13.5 13.6 16 14.8 16 14.8C16 14.8 18.5 13.6 18.5 12.8C18.5 12 17 11.8 16 13Z"
      fill="#FBF9F5"
    />
    {/* Dream Stars / Gentle Steam */}
    <path
      d="M13 7C13 5 14 5 14 3.5"
      stroke="#8CE99A"
      strokeWidth="1.2"
      strokeLinecap="round"
      className="animate-steam"
    />
    <path
      d="M19 8C19 6 20 6 20 4.5"
      stroke="#69DB7C"
      strokeWidth="1.2"
      strokeLinecap="round"
      className="animate-steam"
    />
    <circle cx="8" cy="6" r="0.8" fill="#FFD43B" />
    <circle cx="24" cy="5" r="1" fill="#FFD43B" />
  </svg>
);

/**
 * 🥢 ChopsticksIcon: Pair of wooden hashi tasting benchmarks
 */
export const ChopsticksIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Chopstick 1 */}
    <line x1="6" y1="4" x2="22" y2="28" stroke="#FAB005" strokeWidth="2.2" strokeLinecap="round" />
    {/* Chopstick 2 */}
    <line x1="12" y1="3" x2="25" y2="26" stroke="#F59F00" strokeWidth="2.2" strokeLinecap="round" />
    {/* Dim Sum / Dumpling gripped at tip */}
    <ellipse cx="23.5" cy="25" rx="4.5" ry="3.5" fill="#FBF9F5" stroke="#E5E0D5" strokeWidth="1" />
    <circle cx="23.5" cy="24" r="0.8" fill="#FF6B6B" />
    <circle cx="22" cy="25.5" r="0.5" fill="#40C057" />
    <circle cx="25" cy="25.5" r="0.5" fill="#40C057" />
  </svg>
);

/**
 * 🐟 SoyFishIcon: Japanese fish soy sauce dropper bottle for logs and streams
 */
export const SoyFishIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Red Screw Cap */}
    <rect x="4" y="14" width="3" height="4" rx="1" fill="#E03131" stroke="#C92A2A" strokeWidth="0.8" />
    {/* Fish Shaped Bottle Body */}
    <path
      d="M7 16C9 12 18 10 23 13C25 14.5 26 16 26 16C26 16 25 17.5 23 19C18 22 9 20 7 16Z"
      fill="#2C2537"
      stroke="#4D435C"
      strokeWidth="1.2"
    />
    {/* Soy Sauce Liquid Level */}
    <path
      d="M8.5 16C10 13.5 17 11.5 21 14C22.5 15 23.5 16 23.5 16C23.5 16 22.5 17 21 18C17 20.5 10 18.5 8.5 16Z"
      fill="#131117"
    />
    {/* Fish Tail */}
    <path d="M25 16L29 12V20L25 16Z" fill="#2C2537" stroke="#4D435C" strokeWidth="1" />
    {/* Fish Eye */}
    <circle cx="10" cy="15" r="0.9" fill="#FBF9F5" />
    <circle cx="9.8" cy="15" r="0.4" fill="#131117" />
  </svg>
);

/**
 * 🟢 WasabiBadgeIcon: Cute wasabi dollop for passing assertions
 */
export const WasabiBadgeIcon: React.FC<IconProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
  >
    <path
      d="M12 4C10 7 6 9 6 14C6 17.3 8.7 20 12 20C15.3 20 18 17.3 18 14C18 9 14 7 12 4Z"
      fill="#40C057"
      stroke="#2F9E44"
      strokeWidth="1.5"
    />
    <path d="M9 13.5L11 15.5L15 11" stroke="#FBF9F5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

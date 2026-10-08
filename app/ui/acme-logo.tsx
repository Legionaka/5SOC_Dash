import Image from 'next/image';

export default function AcmeLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/mediclinic-logo.png"
      alt="Medi-Clinic"
      width={320}
      height={320}
      className={className ?? 'h-auto w-full object-contain'}
    />
  );
}

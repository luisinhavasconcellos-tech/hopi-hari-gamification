import hopiLogo from "@/assets/hopi-logo.jpg";

/** Marca da plataforma — logo oficial Hopi Hari (identidade 2025). */
export default function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <img
      src={hopiLogo}
      alt=""
      aria-hidden
      className={`${className} rounded-xl object-cover shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.8)]`}
    />
  );
}

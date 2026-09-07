const hopiLogo = "/manus-storage/hopi-logo_ae1fe729.jpg";

/** Marca da plataforma — logo oficial Hopi Hari (identidade 2025). */
export default function BrandMark({ className = "size-10" }: { className?: string }) {
  return (
    <img
      src={hopiLogo}
      alt=""
      aria-hidden
      className={`${className} rounded-xl object-cover ring-glow`}
    />
  );
}
